package main

import (
	"sync"
	"time"
)

// failLimiter counts recent failures per key.
//
// A recorded response is guarded by a four-digit code, so without a limit
// somebody holding a share link could simply walk all 9000 of them. The limiter
// is keyed on the id being probed rather than on the caller, because the API
// only ever sees a caller's address through proxy headers it cannot trust —
// and because reading one response always means guessing that one id's code, so
// per-id is the granularity that actually bounds the attack.
//
// State is per-process and deliberately not shared across instances: it exists
// to make guessing expensive, not to be an exact counter.
type failLimiter struct {
	mu     sync.Mutex
	hits   map[string][]time.Time
	max    int
	window time.Duration
	// ceiling bounds memory. A caller can only reach it by probing many
	// thousands of distinct ids, which is far more work than guessing one code.
	ceiling int
}

func newFailLimiter(max int, window time.Duration) *failLimiter {
	return &failLimiter{
		hits:    make(map[string][]time.Time),
		max:     max,
		window:  window,
		ceiling: 20000,
	}
}

// allow reports whether key still has attempts left within the window. It also
// expires the key's own old entries, so the counter is a sliding window rather
// than a bucket that refills on a timer.
func (l *failLimiter) allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.sweepLocked()
	l.hits[key] = trimHits(l.hits[key], time.Now().Add(-l.window))
	return len(l.hits[key]) < l.max
}

// fail records one failed attempt against key.
func (l *failLimiter) fail(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.sweepLocked()
	l.hits[key] = append(trimHits(l.hits[key], time.Now().Add(-l.window)), time.Now())
}

// reset clears key, so a success restores the full allowance.
func (l *failLimiter) reset(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.hits, key)
}

// sweepLocked drops everything that has expired once the map grows past its
// ceiling. Running it only then keeps the usual request path O(1) while still
// bounding memory: the full scan is paid once per ceiling insertions, not per
// request.
func (l *failLimiter) sweepLocked() {
	if len(l.hits) <= l.ceiling {
		return
	}
	cutoff := time.Now().Add(-l.window)
	for k, ts := range l.hits {
		if kept := trimHits(ts, cutoff); kept == nil {
			delete(l.hits, k)
		} else {
			l.hits[k] = kept
		}
	}
	// Everything was still inside the window, so a caller really did probe
	// `ceiling` distinct ids recently. Start over rather than grow without
	// bound; that costs them far more requests than brute forcing one code.
	if len(l.hits) > l.ceiling {
		l.hits = make(map[string][]time.Time)
	}
}

// trimHits drops timestamps at or before cutoff, filtering in place.
func trimHits(ts []time.Time, cutoff time.Time) []time.Time {
	kept := ts[:0]
	for _, t := range ts {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	if len(kept) == 0 {
		return nil
	}
	return kept
}

// recordCodeLimiter throttles wrong response access codes: five mistakes against
// the same id inside fifteen minutes and that id stops answering.
var recordCodeLimiter = newFailLimiter(5, 15*time.Minute)
