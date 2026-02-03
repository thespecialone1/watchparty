package config

import (
	"os"
	"strconv"
	"time"
)

// Config holds all configuration for the application
type Config struct {
	// Server settings
	Port string

	// JWT settings
	JWTSecret     string
	JWTExpiration time.Duration

	// Redis settings
	RedisURL      string
	RedisPassword string
	RedisDB       int

	// Session settings
	SessionTTL       time.Duration
	MaxParticipants  int

	// Rate limiting
	CreateSessionLimit int           // per hour per IP
	JoinSessionLimit   int           // per minute per session
	WSMessageLimit     int           // per minute per connection

	// CORS
	AllowedOrigins []string

	// Tunnel
	EnableTunnel bool
}

// Load creates a new Config from environment variables
func Load() *Config {
	return &Config{
		Port: getEnv("PORT", "8080"),

		JWTSecret:     getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		JWTExpiration: getDurationEnv("JWT_EXPIRATION", time.Hour),

		RedisURL:      getEnv("REDIS_URL", "localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       getIntEnv("REDIS_DB", 0),

		SessionTTL:      getDurationEnv("SESSION_TTL", 24*time.Hour),
		MaxParticipants: getIntEnv("MAX_PARTICIPANTS", 10),

		CreateSessionLimit: getIntEnv("CREATE_SESSION_LIMIT", 5),
		JoinSessionLimit:   getIntEnv("JOIN_SESSION_LIMIT", 10),
		WSMessageLimit:     getIntEnv("WS_MESSAGE_LIMIT", 100),

		AllowedOrigins: []string{
			"*", // Allow all origins for Cloudflare Tunnel testing
			"http://localhost:5173",
			getEnv("FRONTEND_URL", "http://localhost:5173"),
		},
		EnableTunnel: getEnv("ENABLE_TUNNEL", "false") == "true",
	}
}

// Helper functions for environment variables
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}
