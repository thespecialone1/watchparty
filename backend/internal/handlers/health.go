package handlers

import (
	"github.com/gofiber/fiber/v2"
)

// HealthHandler handles health check endpoints
type HealthHandler struct{}

// NewHealthHandler creates a new health handler
func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

// Health returns the health status of the server
func (h *HealthHandler) Health(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status": "ok",
	})
}
