# Go Backend Development Skill

## Purpose
This skill provides guidelines for building high-performance, production-ready Go backends with best practices for WatchParty's real-time streaming platform.

## When to Use This Skill
- Building REST APIs in Go
- Implementing WebSocket servers
- Creating real-time communication systems
- Integrating with Redis
- Setting up Cloudflare Tunnel

## Project Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go              # Application entry point
├── internal/
│   ├── config/
│   │   └── config.go            # Configuration management
│   ├── handlers/
│   │   ├── session.go           # Session HTTP handlers
│   │   ├── websocket.go         # WebSocket handlers
│   │   └── health.go            # Health check handlers
│   ├── models/
│   │   ├── session.go           # Session data structures
│   │   └── message.go           # WebSocket message types
│   ├── services/
│   │   ├── session_service.go   # Business logic for sessions
│   │   ├── auth_service.go      # Authentication logic
│   │   └── redis_service.go     # Redis operations
│   ├── middleware/
│   │   ├── auth.go              # JWT validation
│   │   ├── ratelimit.go         # Rate limiting
│   │   └── cors.go              # CORS handling
│   └── utils/
│       ├── crypto.go            # Password hashing
│       └── validation.go        # Input validation
├── pkg/
│   └── websocket/
│       ├── hub.go               # WebSocket connection hub
│       └── client.go            # WebSocket client manager
├── go.mod
├── go.sum
├── Dockerfile
└── .env.example
```

## Core Dependencies

```go
require (
    github.com/gofiber/fiber/v2 v2.52.0
    github.com/gofiber/websocket/v2 v2.2.1
    github.com/redis/go-redis/v9 v9.4.0
    github.com/golang-jwt/jwt/v5 v5.2.0
    github.com/google/uuid v1.5.0
    golang.org/x/crypto v0.18.0
    github.com/joho/godotenv v1.5.1
)
```

## Code Patterns

### 1. Configuration Management

```go
// internal/config/config.go
package config

import (
    "os"
    "github.com/joho/godotenv"
)

type Config struct {
    Port              string
    RedisAddr         string
    RedisPassword     string
    JWTSecret         string
    SessionTTL        int
    MaxParticipants   int
    AllowedOrigins    []string
}

func Load() (*Config, error) {
    godotenv.Load()
    
    return &Config{
        Port:            getEnv("PORT", "8080"),
        RedisAddr:       getEnv("REDIS_ADDR", "localhost:6379"),
        RedisPassword:   getEnv("REDIS_PASSWORD", ""),
        JWTSecret:       getEnv("JWT_SECRET", "change-me"),
        SessionTTL:      3600 * 24, // 24 hours
        MaxParticipants: 10,
        AllowedOrigins:  []string{"http://localhost:5173"},
    }, nil
}

func getEnv(key, fallback string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return fallback
}
```

### 2. Session Model

```go
// internal/models/session.go
package models

import "time"

type Session struct {
    ID              string    `json:"id"`
    Name            string    `json:"name"`
    HostID          string    `json:"host_id"`
    PasswordHash    string    `json:"-"`
    Participants    []string  `json:"participants"`
    MaxParticipants int       `json:"max_participants"`
    CreatedAt       time.Time `json:"created_at"`
    ExpiresAt       time.Time `json:"expires_at"`
}

type CreateSessionRequest struct {
    Name     string `json:"name" validate:"required,min=3,max=50"`
    Password string `json:"password" validate:"required,min=6"`
}

type JoinSessionRequest struct {
    SessionID string `json:"session_id" validate:"required"`
    Password  string `json:"password" validate:"required"`
}

type SessionResponse struct {
    ID          string `json:"id"`
    Name        string `json:"name"`
    ShareURL    string `json:"share_url"`
    Token       string `json:"token,omitempty"`
}
```

### 3. WebSocket Hub Pattern

```go
// pkg/websocket/hub.go
package websocket

import (
    "sync"
)

type Hub struct {
    clients    map[string]map[*Client]bool // sessionID -> clients
    broadcast  chan *Message
    register   chan *Client
    unregister chan *Client
    mu         sync.RWMutex
}

func NewHub() *Hub {
    return &Hub{
        clients:    make(map[string]map[*Client]bool),
        broadcast:  make(chan *Message, 256),
        register:   make(chan *Client),
        unregister: make(chan *Client),
    }
}

func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register:
            h.mu.Lock()
            if _, ok := h.clients[client.SessionID]; !ok {
                h.clients[client.SessionID] = make(map[*Client]bool)
            }
            h.clients[client.SessionID][client] = true
            h.mu.Unlock()

        case client := <-h.unregister:
            h.mu.Lock()
            if clients, ok := h.clients[client.SessionID]; ok {
                if _, ok := clients[client]; ok {
                    delete(clients, client)
                    close(client.send)
                    if len(clients) == 0 {
                        delete(h.clients, client.SessionID)
                    }
                }
            }
            h.mu.Unlock()

        case message := <-h.broadcast:
            h.mu.RLock()
            if clients, ok := h.clients[message.SessionID]; ok {
                for client := range clients {
                    select {
                    case client.send <- message:
                    default:
                        close(client.send)
                        delete(clients, client)
                    }
                }
            }
            h.mu.RUnlock()
        }
    }
}

func (h *Hub) BroadcastToSession(sessionID string, message *Message) {
    message.SessionID = sessionID
    h.broadcast <- message
}
```

### 4. Session Service

```go
// internal/services/session_service.go
package services

import (
    "context"
    "encoding/json"
    "fmt"
    "time"
    "github.com/google/uuid"
    "github.com/redis/go-redis/v9"
    "golang.org/x/crypto/bcrypt"
    "yourapp/internal/models"
)

type SessionService struct {
    redis *redis.Client
    ttl   time.Duration
}

func NewSessionService(redisClient *redis.Client, ttl int) *SessionService {
    return &SessionService{
        redis: redisClient,
        ttl:   time.Duration(ttl) * time.Second,
    }
}

func (s *SessionService) CreateSession(ctx context.Context, req *models.CreateSessionRequest, hostID string) (*models.Session, error) {
    // Hash password
    hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
    if err != nil {
        return nil, fmt.Errorf("failed to hash password: %w", err)
    }

    // Create session
    session := &models.Session{
        ID:              uuid.New().String(),
        Name:            req.Name,
        HostID:          hostID,
        PasswordHash:    string(hash),
        Participants:    []string{hostID},
        MaxParticipants: 10,
        CreatedAt:       time.Now(),
        ExpiresAt:       time.Now().Add(s.ttl),
    }

    // Store in Redis
    key := fmt.Sprintf("session:%s", session.ID)
    data, err := json.Marshal(session)
    if err != nil {
        return nil, fmt.Errorf("failed to marshal session: %w", err)
    }

    if err := s.redis.Set(ctx, key, data, s.ttl).Err(); err != nil {
        return nil, fmt.Errorf("failed to store session: %w", err)
    }

    return session, nil
}

func (s *SessionService) GetSession(ctx context.Context, sessionID string) (*models.Session, error) {
    key := fmt.Sprintf("session:%s", sessionID)
    data, err := s.redis.Get(ctx, key).Bytes()
    if err == redis.Nil {
        return nil, fmt.Errorf("session not found")
    }
    if err != nil {
        return nil, fmt.Errorf("failed to get session: %w", err)
    }

    var session models.Session
    if err := json.Unmarshal(data, &session); err != nil {
        return nil, fmt.Errorf("failed to unmarshal session: %w", err)
    }

    return &session, nil
}

func (s *SessionService) ValidatePassword(ctx context.Context, sessionID, password string) error {
    session, err := s.GetSession(ctx, sessionID)
    if err != nil {
        return err
    }

    if err := bcrypt.CompareHashAndPassword([]byte(session.PasswordHash), []byte(password)); err != nil {
        return fmt.Errorf("invalid password")
    }

    return nil
}
```

### 5. Fiber Route Setup

```go
// cmd/server/main.go
package main

import (
    "log"
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/cors"
    "github.com/gofiber/fiber/v2/middleware/logger"
    "github.com/gofiber/fiber/v2/middleware/recover"
    "yourapp/internal/config"
    "yourapp/internal/handlers"
    "yourapp/pkg/websocket"
)

func main() {
    // Load config
    cfg, err := config.Load()
    if err != nil {
        log.Fatal(err)
    }

    // Initialize services
    redisClient := initRedis(cfg)
    hub := websocket.NewHub()
    go hub.Run()

    // Create Fiber app
    app := fiber.New(fiber.Config{
        ReadTimeout:  time.Second * 10,
        WriteTimeout: time.Second * 10,
    })

    // Middleware
    app.Use(recover.New())
    app.Use(logger.New())
    app.Use(cors.New(cors.Config{
        AllowOrigins:     cfg.AllowedOrigins,
        AllowCredentials: true,
    }))

    // Routes
    api := app.Group("/api")
    
    // Session routes
    sessionHandler := handlers.NewSessionHandler(cfg, redisClient)
    api.Post("/sessions/create", sessionHandler.CreateSession)
    api.Post("/sessions/join", sessionHandler.JoinSession)
    api.Get("/sessions/:id", sessionHandler.GetSession)

    // WebSocket route
    wsHandler := handlers.NewWebSocketHandler(hub, cfg)
    app.Get("/ws/:sessionId", wsHandler.HandleWebSocket)

    // Health check
    app.Get("/health", func(c *fiber.Ctx) error {
        return c.JSON(fiber.Map{"status": "ok"})
    })

    // Start server
    log.Printf("Server starting on port %s", cfg.Port)
    log.Fatal(app.Listen(":" + cfg.Port))
}
```

## Best Practices

### 1. Error Handling
- Always wrap errors with context
- Use structured logging
- Return appropriate HTTP status codes
- Never expose internal errors to clients

### 2. Performance
- Use connection pooling for Redis
- Implement proper context cancellation
- Use buffered channels for high throughput
- Profile with pprof in development

### 3. Security
- Always hash passwords with bcrypt
- Validate all input
- Use HTTPS in production
- Implement rate limiting
- Set proper CORS policies

### 4. Testing
- Write unit tests for services
- Use table-driven tests
- Mock external dependencies
- Test WebSocket connections

### 5. Code Organization
- Keep handlers thin (delegate to services)
- Separate business logic from HTTP logic
- Use interfaces for dependency injection
- Follow Go project layout standards

## Environment Variables

```bash
PORT=8080
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=
JWT_SECRET=your-secret-key-change-in-production
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:5173
```

## Cloudflare Tunnel Setup

```bash
# Install cloudflared
brew install cloudflare/cloudflare/cloudflared  # macOS
# or download from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create watchparty

# Configure tunnel (config.yml)
tunnel: <tunnel-id>
credentials-file: /path/to/credentials.json

ingress:
  - hostname: watchparty.yourdomain.com
    service: http://localhost:8080
  - service: http_status:404

# Run tunnel
cloudflared tunnel run watchparty
```

## Common Pitfalls to Avoid

1. **Not handling WebSocket disconnections properly** - Always cleanup resources
2. **Storing sensitive data in Redis without encryption** - Hash passwords, encrypt tokens
3. **Not implementing rate limiting** - Protect against abuse
4. **Forgetting to set TTL on Redis keys** - Prevents memory leaks
5. **Not using context for cancellation** - Leads to goroutine leaks
6. **Hardcoding configuration values** - Use environment variables

## Performance Optimization

1. **Use Redis pipelining** for batch operations
2. **Implement connection pooling** for database connections
3. **Use sync.Pool** for frequently allocated objects
4. **Enable HTTP/2** for better multiplexing
5. **Use compression** for large payloads
6. **Profile regularly** with pprof

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Redis connection tested
- [ ] Cloudflare Tunnel configured
- [ ] HTTPS enabled
- [ ] Rate limiting active
- [ ] Health checks passing
- [ ] Logging configured
- [ ] Monitoring setup
- [ ] Backup strategy in place