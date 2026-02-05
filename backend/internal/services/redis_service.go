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

// AddParticipant adds a participant to a session atomically
func (r *RedisService) AddParticipant(ctx context.Context, sessionID, userID string) error {
	key := sessionKey(sessionID)
	maxRetries := 5

	// Retry loop for optimistic locking
	for i := 0; i < maxRetries; i++ {
		err := r.client.Watch(ctx, func(tx *redis.Tx) error {
			// Get current session
			data, err := tx.Get(ctx, key).Bytes()
			if err != nil {
				if err == redis.Nil {
					return fmt.Errorf("session not found")
				}
				return err
			}

			var session models.Session
			if err := json.Unmarshal(data, &session); err != nil {
				return err
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

			// Add participant
			session.Participants = append(session.Participants, userID)

			newData, err := json.Marshal(session)
			if err != nil {
				return err
			}

			// Execute transaction
			_, err = tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
				pipe.Set(ctx, key, newData, time.Until(session.ExpiresAt))
				return nil
			})
			return err
		}, key)

		if err == nil {
			return nil // Success
		}
		if err == redis.TxFailedErr {
			// Optimistic lock failed, retry
			continue
		}
		return err // Other error
	}

	return fmt.Errorf("failed to add participant after retries")
}

// RemoveParticipant removes a participant from a session atomically
func (r *RedisService) RemoveParticipant(ctx context.Context, sessionID, userID string) error {
	key := sessionKey(sessionID)
	maxRetries := 5

	for i := 0; i < maxRetries; i++ {
		err := r.client.Watch(ctx, func(tx *redis.Tx) error {
			data, err := tx.Get(ctx, key).Bytes()
			if err != nil {
				if err == redis.Nil {
					return nil // Session already gone, nothing to do
				}
				return err
			}

			var session models.Session
			if err := json.Unmarshal(data, &session); err != nil {
				return err
			}

			// Remove participant
			newParticipants := make([]string, 0, len(session.Participants))
			found := false
			for _, p := range session.Participants {
				if p != userID {
					newParticipants = append(newParticipants, p)
				} else {
					found = true
				}
			}

			if !found {
				return nil // Not in session
			}

			session.Participants = newParticipants
			newData, err := json.Marshal(session)
			if err != nil {
				return err
			}

			_, err = tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
				pipe.Set(ctx, key, newData, time.Until(session.ExpiresAt))
				return nil
			})
			return err
		}, key)

		if err == nil {
			return nil
		}
		if err == redis.TxFailedErr {
			continue
		}
		return err
	}
	return fmt.Errorf("failed to remove participant after retries")
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

// Set stores a key-value pair with expiration
func (r *RedisService) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	return r.client.Set(ctx, key, value, expiration).Err()
}

// Get retrieves a string value for a key
func (r *RedisService) Get(ctx context.Context, key string) (string, error) {
	return r.client.Get(ctx, key).Result()
}

// Chat Persistence based on session ID
func chatKey(sessionID string) string {
	return fmt.Sprintf("chat:%s", sessionID)
}

// SaveChatMessage stores a chat message in a Redis list
func (r *RedisService) SaveChatMessage(ctx context.Context, sessionID string, message []byte) error {
	key := chatKey(sessionID)
	// Push to right
	if err := r.client.RPush(ctx, key, message).Err(); err != nil {
		return err
	}
	// Limit history to 50 messages
	r.client.LTrim(ctx, key, -50, -1)
	// Set expiry same as session (approx) - actually we should match session TTL logic or just set a long TTL
	r.client.Expire(ctx, key, r.config.SessionTTL)
	return nil
}

// GetChatHistory retrieves recent chat messages
func (r *RedisService) GetChatHistory(ctx context.Context, sessionID string) ([][]byte, error) {
	key := chatKey(sessionID)
	// Get all (or last 50)
	results, err := r.client.LRange(ctx, key, 0, -1).Result()
	if err != nil {
		return nil, err
	}

	messages := make([][]byte, len(results))
	for i, res := range results {
		messages[i] = []byte(res)
	}
	return messages, nil
}
