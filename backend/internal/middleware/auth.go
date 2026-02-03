package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"watchparty/internal/services"
)

// AuthMiddleware creates a middleware that validates JWT tokens
func AuthMiddleware(auth *services.AuthService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get authorization header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "Unauthorized",
				"message": "Missing authorization header",
			})
		}

		// Check Bearer prefix
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "Unauthorized",
				"message": "Invalid authorization header format",
			})
		}

		tokenString := parts[1]

		// Validate token
		claims, err := auth.ValidateToken(tokenString)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "Unauthorized",
				"message": "Invalid or expired token",
			})
		}

		// Store claims in context
		c.Locals("sessionId", claims.SessionID)
		c.Locals("userId", claims.UserID)
		c.Locals("username", claims.Username)
		c.Locals("isHost", claims.IsHost)

		return c.Next()
	}
}

// OptionalAuthMiddleware creates a middleware that validates JWT tokens but doesn't require them
func OptionalAuthMiddleware(auth *services.AuthService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Next()
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return c.Next()
		}

		tokenString := parts[1]
		claims, err := auth.ValidateToken(tokenString)
		if err != nil {
			return c.Next()
		}

		// Store claims in context
		c.Locals("sessionId", claims.SessionID)
		c.Locals("userId", claims.UserID)
		c.Locals("username", claims.Username)
		c.Locals("isHost", claims.IsHost)

		return c.Next()
	}
}
