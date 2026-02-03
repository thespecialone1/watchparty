package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

// CORSMiddleware creates a CORS middleware with the specified origins
func CORSMiddleware(allowedOrigins []string) fiber.Handler {
	originsStr := ""
	for i, origin := range allowedOrigins {
		if i > 0 {
			originsStr += ","
		}
		originsStr += origin
	}

	return cors.New(cors.Config{
		AllowOrigins:     originsStr,
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: true,
		MaxAge:           86400, // 24 hours
	})
}
