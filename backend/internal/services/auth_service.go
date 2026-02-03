package services

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"watchparty/internal/config"
)

// AuthService handles authentication operations
type AuthService struct {
	config *config.Config
}

// JWTClaims represents the claims in a JWT token
type JWTClaims struct {
	SessionID string `json:"session_id"`
	UserID    string `json:"user_id"`
	Username  string `json:"username"`
	IsHost    bool   `json:"is_host"`
	jwt.RegisteredClaims
}

// NewAuthService creates a new auth service instance
func NewAuthService(cfg *config.Config) *AuthService {
	return &AuthService{
		config: cfg,
	}
}

// GenerateToken creates a new JWT token for a user
func (a *AuthService) GenerateToken(sessionID, userID, username string, isHost bool) (string, error) {
	now := time.Now()
	claims := JWTClaims{
		SessionID: sessionID,
		UserID:    userID,
		Username:  username,
		IsHost:    isHost,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(a.config.JWTExpiration)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "watchparty",
			Subject:   userID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString([]byte(a.config.JWTSecret))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return signedToken, nil
}

// ValidateToken validates a JWT token and returns the claims
func (a *AuthService) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(a.config.JWTSecret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}
