package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"watchparty/internal/config"
	"watchparty/internal/models"
	"watchparty/internal/utils"
)

// SessionService handles session business logic
type SessionService struct {
	redis  *RedisService
	auth   *AuthService
	config *config.Config
}

// NewSessionService creates a new session service instance
func NewSessionService(redis *RedisService, auth *AuthService, cfg *config.Config) *SessionService {
	return &SessionService{
		redis:  redis,
		auth:   auth,
		config: cfg,
	}
}

// CreateSession creates a new watch party session
func (s *SessionService) CreateSession(ctx context.Context, req *models.CreateSessionRequest, baseURL string) (*models.CreateSessionResponse, error) {
	// Validate request
	if errors := req.Validate(); len(errors) > 0 {
		return nil, fmt.Errorf("validation failed")
	}

	// Generate session ID and user ID
	sessionID := uuid.New().String()
	hostID := uuid.New().String()

	// Hash password
	passwordHash, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create session
	now := time.Now()
	session := &models.Session{
		ID:              sessionID,
		Name:            utils.SanitizeString(req.Name),
		HostID:          hostID,
		PasswordHash:    passwordHash,
		Participants:    []string{hostID},
		MaxParticipants: s.config.MaxParticipants,
		CreatedAt:       now,
		ExpiresAt:       now.Add(s.config.SessionTTL),
	}

	// Save to Redis
	if err := s.redis.SaveSession(ctx, session); err != nil {
		return nil, fmt.Errorf("failed to save session: %w", err)
	}

	// Generate token for host
    hostUsername := utils.GenerateRandomUsername()
	token, err := s.auth.GenerateToken(sessionID, hostID, hostUsername, true)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	// Build share URL
	shareURL := fmt.Sprintf("%s/join/%s", baseURL, sessionID)

	return &models.CreateSessionResponse{
		ID:         sessionID,
		Name:       session.Name,
		ShareURL:   shareURL,
		Token:      token,
		IceServers: s.config.IceServers,
	}, nil
}

// JoinSession allows a user to join an existing session
func (s *SessionService) JoinSession(ctx context.Context, req *models.JoinSessionRequest) (*models.JoinSessionResponse, error) {
	// Validate request
	if errors := req.Validate(); len(errors) > 0 {
		return nil, fmt.Errorf("validation failed")
	}

	// Validate session ID format
	if !utils.IsValidUUID(req.SessionID) {
		return nil, fmt.Errorf("invalid session ID format")
	}

	// Get session
	session, err := s.redis.GetSession(ctx, req.SessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get session: %w", err)
	}
	if session == nil {
		return nil, fmt.Errorf("session not found")
	}

	// Verify password
	if !utils.CheckPassword(req.Password, session.PasswordHash) {
		return nil, fmt.Errorf("invalid password")
	}

	// Check if session is full
	if len(session.Participants) >= session.MaxParticipants {
		return nil, fmt.Errorf("session is full")
	}

	// Generate user ID and add to participants
	userID := uuid.New().String()
	if err := s.redis.AddParticipant(ctx, req.SessionID, userID); err != nil {
		return nil, fmt.Errorf("failed to add participant: %w", err)
	}

	// Generate token for viewer
    viewerUsername := utils.GenerateRandomUsername()
	token, err := s.auth.GenerateToken(req.SessionID, userID, viewerUsername, false)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &models.JoinSessionResponse{
		ID:         session.ID,
		Name:       session.Name,
		Token:      token,
		IceServers: s.config.IceServers,
	}, nil
}

// GetSession retrieves session details
func (s *SessionService) GetSession(ctx context.Context, sessionID string) (*models.SessionInfoResponse, error) {
	// Validate session ID format
	if !utils.IsValidUUID(sessionID) {
		return nil, fmt.Errorf("invalid session ID format")
	}

	session, err := s.redis.GetSession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get session: %w", err)
	}
	if session == nil {
		return nil, fmt.Errorf("session not found")
	}

	return &models.SessionInfoResponse{
		ID:              session.ID,
		Name:            session.Name,
		HostID:          session.HostID,
		Participants:    session.Participants,
		MaxParticipants: session.MaxParticipants,
		CreatedAt:       session.CreatedAt.Format(time.RFC3339),
		ExpiresAt:       session.ExpiresAt.Format(time.RFC3339),
	}, nil
}

// RemoveParticipant removes a participant from a session
func (s *SessionService) RemoveParticipant(ctx context.Context, sessionID, userID string) error {
	return s.redis.RemoveParticipant(ctx, sessionID, userID)
}
