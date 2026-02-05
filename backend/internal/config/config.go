package config

import (
	"encoding/json"
	"log"
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

    // WebRTC
    IceServers []interface{}
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
		IceServers:   getIceServers(),
	}
}

func getIceServers() []interface{} {
	// Default public STUN servers
	defaultServers := []interface{}{
		map[string]interface{}{
			"urls": "stun:stun.l.google.com:19302",
		},
		map[string]interface{}{
			"urls": "stun:stun1.l.google.com:19302",
		},
	}

	envServers := os.Getenv("ICE_SERVERS")
	if envServers == "" {
		return defaultServers
	}

	// Try parsing as JSON
	var servers []interface{}
	if err := json.Unmarshal([]byte(envServers), &servers); err != nil {
		// If JSON parsing fails, assume it's a comma-separated list of STUN/TURN URLs
		// and try to wrap them in simple objects
		// or just log error and return default.
		// For robustness, let's just return defaults if JSON is invalid to avoid breaking app.
		log.Printf("Invalid ICE_SERVERS JSON: %v. Using defaults.", err)
		return defaultServers
	}

	return servers
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
