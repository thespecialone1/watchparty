package websocket

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gofiber/websocket/v2"
	"github.com/google/uuid"
)

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period (must be less than pongWait)
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer
	maxMessageSize = 64 * 1024 // 64KB
)

// NewClient creates a new WebSocket client
func NewClient(conn *websocket.Conn, hub *Hub, sessionID, userID, username string, isHost bool) *Client {
	return &Client{
		ID:        uuid.New().String(),
		SessionID: sessionID,
		UserID:    userID,
		Username:  username,
		IsHost:    isHost,
		Conn:      conn,
		Send:      make(chan []byte, 256),
		hub:       hub,
	}
}

// ReadPump pumps messages from the WebSocket connection to the hub
func (c *Client) ReadPump() {
	defer func() {
		c.hub.Unregister(c)
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			} else {
				log.Printf("WebSocket closed: %v", err) // Log normal closures too for debugging
			}
			break
		}

		// Process message
		c.handleMessage(message)
	}
}

// WritePump pumps messages from the hub to the WebSocket connection
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Hub closed the channel
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleMessage processes incoming messages and routes them appropriately
func (c *Client) handleMessage(message []byte) {
	// Parse message to determine type and routing
	var msg struct {
		Type     string `json:"type"`
		TargetID string `json:"target_id,omitempty"`
	}

	if err := json.Unmarshal(message, &msg); err != nil {
		log.Printf("Failed to parse message: %v", err)
		return
	}

	switch msg.Type {
	case "webrtc_offer", "webrtc_answer", "ice_candidate":
		// Route to specific user if target specified
		if msg.TargetID != "" {
			c.hub.SendToUser(c.SessionID, msg.TargetID, message)
		} else {
			// Broadcast to all except sender
			c.hub.Broadcast(c.SessionID, message, c.ID)
		}

	case "chat":
		// Broadcast chat to everyone including sender
		c.hub.Broadcast(c.SessionID, message, "")

	case "playback_state":
		// Only host can send playback state
		if c.IsHost {
			c.hub.Broadcast(c.SessionID, message, c.ID)
		}

	default:
		// Broadcast other messages
		c.hub.Broadcast(c.SessionID, message, c.ID)
	}
}
