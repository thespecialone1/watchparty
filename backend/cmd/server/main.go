package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"

	"watchparty/internal/config"
	"watchparty/internal/handlers"
	"watchparty/internal/middleware"
	"watchparty/internal/services"
	"watchparty/pkg/tunnel"
	"watchparty/pkg/websocket"
)

func main() {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Load configuration
	cfg := config.Load()

	// Initialize Redis
	redisService, err := services.NewRedisService(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer redisService.Close()
	log.Println("Connected to Redis")

	// Initialize services
	authService := services.NewAuthService(cfg)
	sessionService := services.NewSessionService(redisService, authService, cfg)

	// Initialize WebSocket hub
	hub := websocket.NewHub()
	go hub.Run()
	log.Println("WebSocket hub started")

	// Determine Base URL (Tunnel or Config)
	baseURL := getBaseURL(cfg)
	if cfg.EnableTunnel {
		log.Println("Starting Cloudflare Tunnel...")
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		
		// Start tunnel for frontend port (5173)
		tunnelURL, err := tunnel.StartTunnel(ctx, "5173")
		if err != nil {
			log.Printf("Failed to start tunnel: %v", err)
			log.Println("Falling back to default base URL")
		} else {
			log.Printf("Tunnel started successfully! Public URL: %s", tunnelURL)
			baseURL = tunnelURL
		}
	}

	// Initialize handlers
	healthHandler := handlers.NewHealthHandler()
	sessionHandler := handlers.NewSessionHandler(sessionService, baseURL)
	wsHandler := handlers.NewWebSocketHandler(hub, authService)

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "WatchParty",
		ServerHeader: "WatchParty",
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error":   "Server Error",
				"message": err.Error(),
			})
		},
	})

	// Global middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} (${latency})\n",
	}))
	app.Use(middleware.CORSMiddleware(cfg.AllowedOrigins))

	// Health check (no auth required)
	app.Get("/health", healthHandler.Health)

	// API routes
	api := app.Group("/api")

	// Session routes
	sessions := api.Group("/sessions")
	sessions.Post("/create",
		middleware.CreateSessionRateLimiter(cfg.CreateSessionLimit),
		sessionHandler.CreateSession,
	)
	sessions.Post("/join",
		middleware.JoinSessionRateLimiter(cfg.JoinSessionLimit),
		sessionHandler.JoinSession,
	)
	sessions.Get("/:id",
		middleware.AuthMiddleware(authService),
		sessionHandler.GetSession,
	)

	// WebSocket route
	app.Use("/ws/:sessionId", wsHandler.UpgradeMiddleware())
	app.Get("/ws/:sessionId", wsHandler.HandleWebSocket())

	// Serve static frontend files in production
	// The frontend dist folder should be at ../frontend/dist relative to the binary
	frontendDist := os.Getenv("FRONTEND_DIST")
	if frontendDist == "" {
		frontendDist = "../frontend/dist"
	}
	
	// Check if frontend dist exists
	if _, err := os.Stat(frontendDist); err == nil {
		log.Printf("Serving frontend from: %s", frontendDist)
		
		// Serve static files
		app.Static("/", frontendDist)
		
		// SPA fallback - serve index.html for all unmatched routes
		app.Get("/*", func(c *fiber.Ctx) error {
			return c.SendFile(frontendDist + "/index.html")
		})
	} else {
		log.Println("Frontend dist not found, running in API-only mode")
	}

	// Graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		log.Println("Shutting down server...")
		if err := app.Shutdown(); err != nil {
			log.Printf("Server shutdown error: %v", err)
		}
	}()

	// Start server
	port := cfg.Port
	log.Printf("Starting WatchParty server on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

func getBaseURL(cfg *config.Config) string {
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL != "" {
		return frontendURL
	}
	return "http://localhost:5173"
}
