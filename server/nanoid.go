package main

import (
	"crypto/rand"
	"math/big"
	"sync/atomic"
	"time"
)

// nanoid alphabet + length parity with the nanoid package used by the Bun server.
const nanoAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict"

var nanoRandState atomic.Uint64

func init() { nanoRandState.Store(uint64(time.Now().UnixNano())) }

// nanoID generates a URL-safe random id (same alphabet as js nanoid's default).
func nanoID(n int) string {
	out := make([]byte, n)
	max := big.NewInt(int64(len(nanoAlphabet)))
	for i := 0; i < n; i++ {
		idx, err := rand.Int(rand.Reader, max)
		if err != nil {
			// crypto/rand failure is practically impossible; fall back to a time-derived byte
			out[i] = nanoAlphabet[nanoRandState.Add(1)%uint64(len(nanoAlphabet))]
			continue
		}
		out[i] = nanoAlphabet[idx.Int64()]
	}
	return string(out)
}

const lowerAlphabet = "0123456789abcdefghijklmnopqrstuvwxyz"

// randSuffix mimics Math.random().toString(36).slice(4, 8): 4 chars of [0-9a-z].
func randSuffix(n int) string {
	out := make([]byte, n)
	max := big.NewInt(int64(len(lowerAlphabet)))
	for i := 0; i < n; i++ {
		idx, err := rand.Int(rand.Reader, max)
		if err != nil {
			out[i] = lowerAlphabet[nanoRandState.Add(1)%uint64(len(lowerAlphabet))]
			continue
		}
		out[i] = lowerAlphabet[idx.Int64()]
	}
	return string(out)
}
