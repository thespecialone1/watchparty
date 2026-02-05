package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"
    "context"

	"github.com/gofiber/websocket/v2"
    "watchparty/internal/services"
)

// Client represents a connected WebSocket client
type Client struct {
	ID        string
	SessionID string
	UserID    string
	Username  string
	IsHost    bool
	Conn      *websocket.Conn
	Send      chan []byte
	hub       *Hub
	mu        sync.Mutex
}

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	// Registered clients by session ID
	sessions map[string]map[string]*Client

	// Register requests from clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Broadcast messages to a session
	broadcast chan *BroadcastMessage

	// Direct messages to a specific client
	direct chan *DirectMessage

	mu    sync.RWMutex
    redis *services.RedisService
}

// BroadcastMessage represents a message to broadcast to a session
type BroadcastMessage struct {
	SessionID string
	Message   []byte
	ExcludeID string // Optional: exclude this client ID from broadcast
}

// DirectMessage represents a message to send to a specific client
type DirectMessage struct {
	SessionID string
	TargetID  string
	Message   []byte
}

// NewHub creates a new Hub instance
func NewHub(redis *services.RedisService) *Hub {
	return &Hub{
		sessions:   make(map[string]map[string]*Client),
		register:   make(chan *Client),
		unregister:   make(chan *Client),
		broadcast:  make(chan *BroadcastMessage, 256),
		direct:     make(chan *DirectMessage, 256),
        redis:      redis,
	}
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.registerClient(client)

		case client := <-h.unregister:
			h.unregisterClient(client)

		case message := <-h.broadcast:
			h.broadcastToSession(message)

		case message := <-h.direct:
			h.sendToClient(message)
		}
	}
}

func (h *Hub) registerClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Create session map if it doesn't exist
	if _, ok := h.sessions[client.SessionID]; !ok {
		h.sessions[client.SessionID] = make(map[string]*Client)
	}

	h.sessions[client.SessionID][client.ID] = client
	log.Printf("Client %s registered to session %s", client.ID, client.SessionID)

    // Send chat history
    if history, err := h.redis.GetChatHistory(context.Background(), client.SessionID); err == nil {
        for _, msg := range history {
            // Send directly to client channel
            select {
            case client.Send <- msg:
            default:
            }
        }
    }

	// Notify other clients about new user
	h.notifyUserJoined(client)
}

// SaveMessage stores a message in Redis
func (h *Hub) SaveMessage(sessionID string, message []byte) {
    // Fire and forget, don't block
    go func() {
        h.redis.SaveChatMessage(context.Background(), sessionID, message)
    }()
}

func (h *Hub) unregisterClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if session, ok := h.sessions[client.SessionID]; ok {
		if _, ok := session[client.ID]; ok {
			delete(session, client.ID)
			close(client.Send)

			// Remove session if empty
			if len(session) == 0 {
				delete(h.sessions, client.SessionID)
			}

			log.Printf("Client %s unregistered from session %s", client.ID, client.SessionID)

			// Notify other clients about user leaving
			h.notifyUserLeft(client)
		}
	}
}

func (h *Hub) broadcastToSession(msg *BroadcastMessage) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if session, ok := h.sessions[msg.SessionID]; ok {
		for id, client := range session {
			if msg.ExcludeID != "" && id == msg.ExcludeID {
				continue
			}
			select {
			case client.Send <- msg.Message:
			default:
				// Client buffer full, skip
				log.Printf("Client %s buffer full, skipping message", id)
			}
		}
	}
}

func (h *Hub) sendToClient(msg *DirectMessage) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if session, ok := h.sessions[msg.SessionID]; ok {
		// Find client by user ID
		for _, client := range session {
			if client.UserID == msg.TargetID || client.ID == msg.TargetID {
				select {
				case client.Send <- msg.Message:
				default:
					log.Printf("Client %s buffer full, skipping direct message", client.ID)
				}
				return
			}
		}
	}
}

func (h *Hub) notifyUserJoined(client *Client) {
	msg := map[string]interface{}{
		"type": "user_joined",
		"payload": map[string]interface{}{
			"user_id":  client.UserID,
			"username": client.Username,
		},
		"session_id": client.SessionID,
		"user_id":    client.UserID,
		"timestamp":  time.Now().UnixMilli(),
	}

	data, _ := json.Marshal(msg)

	// Broadcast to all clients in session except the new one
	if session, ok := h.sessions[client.SessionID]; ok {
		for id, c := range session {
			if id != client.ID {
				select {
				case c.Send <- data:
				default:
				}
			}
		}
	}
}

func (h *Hub) notifyUserLeft(client *Client) {
	msg := map[string]interface{}{
		"type": "user_left",
		"payload": map[string]interface{}{
			"user_id":  client.UserID,
			"username": client.Username,
		},
		"session_id": client.SessionID,
		"user_id":    client.UserID,
		"timestamp":  time.Now().UnixMilli(),
	}

	data, _ := json.Marshal(msg)

	// Broadcast to remaining clients in session
	if session, ok := h.sessions[client.SessionID]; ok {
		for _, c := range session {
			select {
			case c.Send <- data:
			default:
			}
		}
	}
}

// Register adds a client to the hub
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Unregister removes a client from the hub
func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

// Broadcast sends a message to all clients in a session
func (h *Hub) Broadcast(sessionID string, message []byte, excludeID string) {
	h.broadcast <- &BroadcastMessage{
		SessionID: sessionID,
		Message:   message,
		ExcludeID: excludeID,
	}
}

// SendToUser sends a message to a specific user
func (h *Hub) SendToUser(sessionID, targetID string, message []byte) {
	h.direct <- &DirectMessage{
		SessionID: sessionID,
		TargetID:  targetID,
		Message:   message,
	}
}

// GetSessionClients returns all clients in a session
func (h *Hub) GetSessionClients(sessionID string) []*Client {
	h.mu.RLock()
	defer h.mu.RUnlock()

	var clients []*Client
	if session, ok := h.sessions[sessionID]; ok {
		for _, client := range session {
			clients = append(clients, client)
		}
	}
	return clients
}

// GetClientCount returns the number of clients in a session
func (h *Hub) GetClientCount(sessionID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if session, ok := h.sessions[sessionID]; ok {
		return len(session)
	}
	return 0
}
