package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
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
		IceServers: s.getIceServers(ctx),
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
		IceServers: s.getIceServers(ctx),
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

// getIceServers retrieves ICE servers from Metered.ca or config
func (s *SessionService) getIceServers(ctx context.Context) []interface{} {
	if s.config.MeteredAPIKey == "" {
		return s.config.IceServers
	}

	// Try to get from cache
	if cached, err := s.redis.Get(ctx, "sys:ice_servers"); err == nil {
		var servers []interface{}
		if err := json.Unmarshal([]byte(cached), &servers); err == nil {
			return servers
		}
	}

	// Fetch from Metered API
	// Format: https://<app-name>.metered.live/api/v1/turn/credentials?apiKey=<api-key>
	// We need app name. Actually usually it's just metered.live/api/v1/turn/credentials?apiKey=... 
	// The user provided "vibecodingisreal.metered.live".
    // I should probably make the domain configurable or extract it.
	// User said: "Metered Domain: vibecodingisreal.metered.live"
	// So URL is https://vibecodingisreal.metered.live/api/v1/turn/credentials?apiKey=...

	domain := "vibecodingisreal.metered.live" // Default or from env if I added it.
    // I didn't add MeteredDomain to config, I should have. 
    // I will hardcode it for now as user provided it or try to fetch it from env "METERED_DOMAIN" using `os.Getenv` if I didn't add it to config struct.
    // Actually I can check if config has it. I didn't add it.
    // I'll use os.Getenv for now.
    
    if envDomain := os.Getenv("METERED_DOMAIN"); envDomain != "" {
        domain = envDomain
    }

	url := fmt.Sprintf("https://%s/api/v1/turn/credentials?apiKey=%s", domain, s.config.MeteredAPIKey)
	
    resp, err := http.Get(url)
	if err != nil {
		fmt.Printf("Failed to fetch ICE servers: %v\n", err)
		return s.config.IceServers
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("Metered API returned status: %d\n", resp.StatusCode)
		return s.config.IceServers
	}

    // Metered returns a JSON array of ICE servers directly? Or an object?
    // Docs: Returns [ { "urls": "...", "username": "...", "credential": "..." } ]
    // So we can unmarshal directly into []interface{}
	var servers []interface{}
	if err := json.NewDecoder(resp.Body).Decode(&servers); err != nil {
		fmt.Printf("Failed to decode ICE servers: %v\n", err)
		return s.config.IceServers
	}

	// Cache for 1 hour
	if data, err := json.Marshal(servers); err == nil {
		s.redis.Set(ctx, "sys:ice_servers", string(data), 1*time.Hour)
	}

	return servers
}
