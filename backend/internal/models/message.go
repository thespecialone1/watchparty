package models

import "encoding/json"

// MessageType defines the type of WebSocket message
type MessageType string

const (
	MessageTypeChat            MessageType = "chat"
	MessageTypeWebRTCOffer     MessageType = "webrtc_offer"
	MessageTypeWebRTCAnswer    MessageType = "webrtc_answer"
	MessageTypeICECandidate    MessageType = "ice_candidate"
	MessageTypePlaybackState   MessageType = "playback_state"
	MessageTypePlaybackControl MessageType = "playback_control"
	MessageTypeUserJoined      MessageType = "user_joined"
	MessageTypeUserLeft        MessageType = "user_left"
)

// WebSocketMessage is the standard message format for WebSocket communication
type WebSocketMessage struct {
	Type      MessageType     `json:"type"`
	Payload   json.RawMessage `json:"payload"`
	SessionID string          `json:"session_id"`
	UserID    string          `json:"user_id"`
	TargetID  string          `json:"target_id,omitempty"` // For directed messages
	Timestamp int64           `json:"timestamp"`
}

// ChatPayload is the payload for chat messages
type ChatPayload struct {
	ID        string `json:"id,omitempty"`
	UserID    string `json:"user_id"`
	Username  string `json:"username"`
	Message   string `json:"message"`
	Timestamp int64  `json:"timestamp"`
}

// UserEventPayload is the payload for user joined/left events
type UserEventPayload struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
}

// PlaybackStatePayload is the payload for playback synchronization
type PlaybackStatePayload struct {
	Playing     bool    `json:"playing"`
	CurrentTime float64 `json:"current_time"`
	Volume      float64 `json:"volume"`
}

// PlaybackControlPayload is the payload for playback control commands
type PlaybackControlPayload struct {
	Action       string  `json:"action"`        // play, pause, seek_forward, seek_backward, toggle
	SeekSeconds  float64 `json:"seek_seconds"`  // For seek: number of seconds to seek
	FromUser     string  `json:"from_user"`     // User ID who sent the command
	FromUsername string  `json:"from_username"` // Username who sent the command
}

// WebRTCSignalPayload represents WebRTC signaling data
type WebRTCSignalPayload struct {
	Type      string          `json:"type,omitempty"` // offer, answer
	SDP       string          `json:"sdp,omitempty"`
	Candidate json.RawMessage `json:"candidate,omitempty"`
}

// ErrorResponse is a standard error response
type ErrorResponse struct {
	Error   string            `json:"error"`
	Message string            `json:"message,omitempty"`
	Details map[string]string `json:"details,omitempty"`
}

// SuccessResponse is a standard success response
type SuccessResponse struct {
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
}
