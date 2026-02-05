package models

import (
	"time"
)

// Session represents a watch party session
type Session struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	HostID          string    `json:"host_id"`
	PasswordHash    string    `json:"password_hash"` // Stored in Redis, not exposed via API
	Participants    []string  `json:"participants"`
	MaxParticipants int       `json:"max_participants"`
	CreatedAt       time.Time `json:"created_at"`
	ExpiresAt       time.Time `json:"expires_at"`
}

// CreateSessionRequest is the request body for creating a session
type CreateSessionRequest struct {
	Name      string `json:"name"`
	Password  string `json:"password"`
	AdminCode string `json:"admin_code"`
}

// CreateSessionResponse is the response for session creation
type CreateSessionResponse struct {
	ID         string        `json:"id"`
	Name       string        `json:"name"`
	ShareURL   string        `json:"share_url"`
	Token      string        `json:"token"`
	IceServers []interface{} `json:"ice_servers"`
}

// JoinSessionRequest is the request body for joining a session
type JoinSessionRequest struct {
	SessionID string `json:"session_id"`
	Password  string `json:"password"`
}

// JoinSessionResponse is the response for joining a session
type JoinSessionResponse struct {
	ID         string        `json:"id"`
	Name       string        `json:"name"`
	Token      string        `json:"token"`
	IceServers []interface{} `json:"ice_servers"`
}

// SessionInfoResponse is the response for getting session details
type SessionInfoResponse struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	HostID          string   `json:"host_id"`
	Participants    []string `json:"participants"`
	MaxParticipants int      `json:"max_participants"`
	CreatedAt       string   `json:"created_at"`
	ExpiresAt       string   `json:"expires_at"`
}

// Validate checks if the create session request is valid
func (r *CreateSessionRequest) Validate() map[string]string {
	errors := make(map[string]string)

	if len(r.Name) < 3 || len(r.Name) > 50 {
		errors["name"] = "Name must be between 3 and 50 characters"
	}

	if len(r.Password) < 6 {
		errors["password"] = "Password must be at least 6 characters"
	}

	return errors
}

// Validate checks if the join session request is valid
func (r *JoinSessionRequest) Validate() map[string]string {
	errors := make(map[string]string)

	if r.SessionID == "" {
		errors["session_id"] = "Session ID is required"
	}

	if r.Password == "" {
		errors["password"] = "Password is required"
	}

	return errors
}
