package middleware

import (
	"strconv"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
)

// RateLimiter provides rate limiting functionality
type RateLimiter struct {
	requests map[string]*rateLimitEntry
	mu       sync.RWMutex
	limit    int
	window   time.Duration
}

type rateLimitEntry struct {
	count     int
	resetTime time.Time
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		requests: make(map[string]*rateLimitEntry),
		limit:    limit,
		window:   window,
	}

	// Start cleanup goroutine
	go rl.cleanup()

	return rl
}

// cleanup removes expired entries periodically
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(rl.window)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for key, entry := range rl.requests {
			if now.After(entry.resetTime) {
				delete(rl.requests, key)
			}
		}
		rl.mu.Unlock()
	}
}

// Allow checks if the request should be allowed
func (rl *RateLimiter) Allow(key string) (bool, int, time.Time) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	entry, exists := rl.requests[key]

	if !exists || now.After(entry.resetTime) {
		// Create new entry
		rl.requests[key] = &rateLimitEntry{
			count:     1,
			resetTime: now.Add(rl.window),
		}
		return true, rl.limit - 1, now.Add(rl.window)
	}

	// Check if limit exceeded
	if entry.count >= rl.limit {
		return false, 0, entry.resetTime
	}

	// Increment count
	entry.count++
	return true, rl.limit - entry.count, entry.resetTime
}

// CreateSessionRateLimiter returns middleware for session creation rate limiting
func CreateSessionRateLimiter(limit int) fiber.Handler {
	rl := NewRateLimiter(limit, time.Hour)

	return func(c *fiber.Ctx) error {
		ip := c.IP()
		allowed, remaining, reset := rl.Allow(ip)

		// Set rate limit headers
		c.Set("X-RateLimit-Limit", strconv.Itoa(limit))
		c.Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Set("X-RateLimit-Reset", strconv.FormatInt(reset.Unix(), 10))

		if !allowed {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   "Rate limit exceeded",
				"message": "Maximum " + strconv.Itoa(limit) + " session creations per hour",
			})
		}

		return c.Next()
	}
}

// JoinSessionRateLimiter returns middleware for session join rate limiting
func JoinSessionRateLimiter(limit int) fiber.Handler {
	rl := NewRateLimiter(limit, time.Minute)

	return func(c *fiber.Ctx) error {
		// Use session ID + IP as key
		sessionID := c.Params("sessionId", "")
		if sessionID == "" {
			// Try to get from body
			var body struct {
				SessionID string `json:"session_id"`
			}
			if err := c.BodyParser(&body); err == nil {
				sessionID = body.SessionID
			}
		}

		key := sessionID + ":" + c.IP()
		allowed, remaining, reset := rl.Allow(key)

		// Set rate limit headers
		c.Set("X-RateLimit-Limit", strconv.Itoa(limit))
		c.Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Set("X-RateLimit-Reset", strconv.FormatInt(reset.Unix(), 10))

		if !allowed {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   "Rate limit exceeded",
				"message": "Too many join attempts, please try again later",
			})
		}

		return c.Next()
	}
}
