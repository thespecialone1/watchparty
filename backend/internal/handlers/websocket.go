package handlers

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"watchparty/internal/services"
	ws "watchparty/pkg/websocket"
)

// WebSocketHandler handles WebSocket connections
type WebSocketHandler struct {
	hub         *ws.Hub
	authService *services.AuthService
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler(hub *ws.Hub, authService *services.AuthService) *WebSocketHandler {
	return &WebSocketHandler{
		hub:         hub,
		authService: authService,
	}
}

// UpgradeMiddleware checks if the connection should be upgraded to WebSocket
func (h *WebSocketHandler) UpgradeMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			// Validate token before upgrade
			token := c.Query("token")
			if token == "" {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error":   "Unauthorized",
					"message": "Token is required",
				})
			}

			claims, err := h.authService.ValidateToken(token)
			if err != nil {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error":   "Unauthorized",
					"message": "Invalid or expired token",
				})
			}

			// Verify session ID matches
			sessionID := c.Params("sessionId")
			if claims.SessionID != sessionID {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error":   "Forbidden",
					"message": "Token doesn't match session",
				})
			}

			// Store claims in locals for handler
			c.Locals("sessionId", claims.SessionID)
			c.Locals("userId", claims.UserID)
			c.Locals("username", claims.Username)
			c.Locals("isHost", claims.IsHost)

			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	}
}

// HandleWebSocket handles WebSocket connections
func (h *WebSocketHandler) HandleWebSocket() fiber.Handler {
	return websocket.New(func(c *websocket.Conn) {
		sessionID := c.Locals("sessionId").(string)
		userID := c.Locals("userId").(string)
		username := c.Locals("username").(string)
		isHost := c.Locals("isHost").(bool)

		log.Printf("WebSocket connection: session=%s user=%s isHost=%v", sessionID, userID, isHost)

		// Create client
		client := ws.NewClient(c, h.hub, sessionID, userID, username, isHost)

		// Register client
		h.hub.Register(client)

		// Start read/write pumps
		go client.WritePump()
		client.ReadPump() // This blocks until connection closes
	})
}
