package handlers

import (
	"github.com/gofiber/fiber/v2"
	"watchparty/internal/config"
	"watchparty/internal/models"
	"watchparty/internal/services"
)

// SessionHandler handles session-related HTTP endpoints
type SessionHandler struct {
	sessionService *services.SessionService
	baseURL        string
}

// NewSessionHandler creates a new session handler
func NewSessionHandler(sessionService *services.SessionService, baseURL string) *SessionHandler {
	return &SessionHandler{
		sessionService: sessionService,
		baseURL:        baseURL,
	}
}

// CreateSession handles POST /api/sessions/create
func (h *SessionHandler) CreateSession(c *fiber.Ctx) error {
	var req models.CreateSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "Bad Request",
			Message: "Invalid request body",
		})
	}

	// Validate request
	if errors := req.Validate(); len(errors) > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "Validation failed",
			Details: errors,
		})
	}

	// Validate Admin Code if configured
	cfg := config.Load()
	if cfg.AdminSecret != "" && req.AdminCode != cfg.AdminSecret {
		return c.Status(fiber.StatusForbidden).JSON(models.ErrorResponse{
			Error:   "Forbidden",
			Message: "Invalid admin code. Session creation is restricted.",
		})
	}

	// Create session
	response, err := h.sessionService.CreateSession(c.Context(), &req, h.baseURL)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to create session",
		})
	}

	return c.Status(fiber.StatusOK).JSON(response)
}

// JoinSession handles POST /api/sessions/join
func (h *SessionHandler) JoinSession(c *fiber.Ctx) error {
	var req models.JoinSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "Bad Request",
			Message: "Invalid request body",
		})
	}

	// Validate request
	if errors := req.Validate(); len(errors) > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "Validation failed",
			Details: errors,
		})
	}

	// Join session
	response, err := h.sessionService.JoinSession(c.Context(), &req)
	if err != nil {
		// Determine error type
		switch err.Error() {
		case "session not found":
			return c.Status(fiber.StatusNotFound).JSON(models.ErrorResponse{
				Error:   "Session not found",
				Message: "The session you're trying to join doesn't exist or has expired",
			})
		case "invalid password":
			return c.Status(fiber.StatusUnauthorized).JSON(models.ErrorResponse{
				Error:   "Authentication failed",
				Message: "Invalid password",
			})
		case "session is full":
			return c.Status(fiber.StatusForbidden).JSON(models.ErrorResponse{
				Error:   "Session full",
				Message: "This session has reached the maximum number of participants",
			})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
				Error:   "Internal Server Error",
				Message: "Failed to join session",
			})
		}
	}

	return c.Status(fiber.StatusOK).JSON(response)
}

// GetSession handles GET /api/sessions/:id
func (h *SessionHandler) GetSession(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	if sessionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.ErrorResponse{
			Error:   "Bad Request",
			Message: "Session ID is required",
		})
	}

	// Verify the user has access to this session
	tokenSessionID := c.Locals("sessionId")
	if tokenSessionID != nil && tokenSessionID.(string) != sessionID {
		return c.Status(fiber.StatusForbidden).JSON(models.ErrorResponse{
			Error:   "Forbidden",
			Message: "You don't have access to this session",
		})
	}

	// Get session
	response, err := h.sessionService.GetSession(c.Context(), sessionID)
	if err != nil {
		if err.Error() == "session not found" {
			return c.Status(fiber.StatusNotFound).JSON(models.ErrorResponse{
				Error:   "Session not found",
				Message: "The requested session doesn't exist or has expired",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to get session",
		})
	}

	return c.Status(fiber.StatusOK).JSON(response)
}
