package main

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Minimal /ws endpoint — matches the TS server behaviour: upgrade, hold the
// connection open, ignore inbound messages. (The Bun app never wires
// triggerEvent/listenEvent into any controller, so there is no application
// protocol to replicate.)

func timeNowAddSecs(secs int64) time.Time {
	return time.Now().Add(time.Duration(secs) * time.Second)
}

var wsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

var (
	wsMu    sync.Mutex
	wsConns = map[*websocket.Conn]bool{}
)

func serveWS(w http.ResponseWriter, r *http.Request) bool {
	if r.URL.Path != "/ws" {
		return false
	}
	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return true
	}
	wsMu.Lock()
	wsConns[conn] = true
	wsMu.Unlock()
	go func() {
		defer func() {
			wsMu.Lock()
			delete(wsConns, conn)
			wsMu.Unlock()
			conn.Close()
		}()
		conn.SetReadLimit(1 << 20)
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}()
	return true
}

// broadcastWsMessage pushes {"success":true,"name":…,"data":…} to every
// connected client (kept for parity with the TS WebSocketServerService).
func broadcastWsMessage(event string, payload any) {
	msg, err := json.Marshal(map[string]any{"success": true, "name": event, "data": payload})
	if err != nil {
		return
	}
	wsMu.Lock()
	defer wsMu.Unlock()
	for conn := range wsConns {
		conn.SetWriteDeadline(timeNowAddSecs(5))
		if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			conn.Close()
			delete(wsConns, conn)
		}
	}
}
