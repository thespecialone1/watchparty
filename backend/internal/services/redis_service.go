package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"watchparty/internal/config"
	"watchparty/internal/models"
)

// RedisService handles all Redis operations
type RedisService struct {
	client *redis.Client
	config *config.Config
}

// NewRedisService creates a new Redis service instance
func NewRedisService(cfg *config.Config) (*RedisService, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisURL,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return &RedisService{
		client: client,
		config: cfg,
	}, nil
}

// Close closes the Redis connection
func (r *RedisService) Close() error {
	return r.client.Close()
}

// Session key helpers
func sessionKey(sessionID string) string {
	return fmt.Sprintf("session:%s", sessionID)
}

func connectionsKey(sessionID string) string {
	return fmt.Sprintf("connections:%s", sessionID)
}

// SaveSession stores a session in Redis
func (r *RedisService) SaveSession(ctx context.Context, session *models.Session) error {
	data, err := json.Marshal(session)
	if err != nil {
		return fmt.Errorf("failed to marshal session: %w", err)
	}

	key := sessionKey(session.ID)
	ttl := time.Until(session.ExpiresAt)

	if err := r.client.Set(ctx, key, data, ttl).Err(); err != nil {
		return fmt.Errorf("failed to save session: %w", err)
	}

	return nil
}

// GetSession retrieves a session from Redis
func (r *RedisService) GetSession(ctx context.Context, sessionID string) (*models.Session, error) {
	key := sessionKey(sessionID)
	data, err := r.client.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // Session not found
		}
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	var session models.Session
	if err := json.Unmarshal(data, &session); err != nil {
		return nil, fmt.Errorf("failed to unmarshal session: %w", err)
	}

	return &session, nil
}

// DeleteSession removes a session from Redis
func (r *RedisService) DeleteSession(ctx context.Context, sessionID string) error {
	key := sessionKey(sessionID)
	if err := r.client.Del(ctx, key).Err(); err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}
	return nil
}

// AddParticipant adds a participant to a session
func (r *RedisService) AddParticipant(ctx context.Context, sessionID, userID string) error {
	session, err := r.GetSession(ctx, sessionID)
	if err != nil {
		return err
	}
	if session == nil {
		return fmt.Errorf("session not found")
	}

	// Check if already a participant
	for _, p := range session.Participants {
		if p == userID {
			return nil // Already a participant
		}
	}

	// Check max participants
	if len(session.Participants) >= session.MaxParticipants {
		return fmt.Errorf("session is full")
	}

	session.Participants = append(session.Participants, userID)
	return r.SaveSession(ctx, session)
}

// RemoveParticipant removes a participant from a session
func (r *RedisService) RemoveParticipant(ctx context.Context, sessionID, userID string) error {
	session, err := r.GetSession(ctx, sessionID)
	if err != nil {
		return err
	}
	if session == nil {
		return nil // Session already gone
	}

	// Remove participant
	newParticipants := make([]string, 0, len(session.Participants))
	for _, p := range session.Participants {
		if p != userID {
			newParticipants = append(newParticipants, p)
		}
	}
	session.Participants = newParticipants

	return r.SaveSession(ctx, session)
}

// AddConnection tracks an active WebSocket connection
func (r *RedisService) AddConnection(ctx context.Context, sessionID, connectionID string) error {
	key := connectionsKey(sessionID)
	if err := r.client.SAdd(ctx, key, connectionID).Err(); err != nil {
		return fmt.Errorf("failed to add connection: %w", err)
	}
	// Set TTL on connections set
	r.client.Expire(ctx, key, r.config.SessionTTL)
	return nil
}

// RemoveConnection removes a WebSocket connection
func (r *RedisService) RemoveConnection(ctx context.Context, sessionID, connectionID string) error {
	key := connectionsKey(sessionID)
	if err := r.client.SRem(ctx, key, connectionID).Err(); err != nil {
		return fmt.Errorf("failed to remove connection: %w", err)
	}
	return nil
}

// GetConnectionCount returns the number of active connections for a session
func (r *RedisService) GetConnectionCount(ctx context.Context, sessionID string) (int64, error) {
	key := connectionsKey(sessionID)
	count, err := r.client.SCard(ctx, key).Result()
	if err != nil {
		return 0, fmt.Errorf("failed to get connection count: %w", err)
	}
	return count, nil
}

// Health checks if Redis is healthy
func (r *RedisService) Health(ctx context.Context) error {
	return r.client.Ping(ctx).Err()
}
