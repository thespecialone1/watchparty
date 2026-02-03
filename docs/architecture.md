# System Architecture

## Component Overview

### Backend Services (Go)

#### 1. WebSocket Server
- Handles real-time bidirectional communication
- Manages WebRTC signaling (offer/answer/ICE candidates)
- Broadcasts chat messages
- Syncs playback state across clients

#### 2. Session Manager
- Creates and validates sessions
- Manages session lifecycle
- Stores session metadata in Redis
- Handles password verification

#### 3. Authentication Handler
- Validates session passwords
- Issues JWT tokens for authenticated users
- Rate limiting for brute force protection

#### 4. Health Monitor
- Tracks active connections
- Monitors system resources
- Provides health check endpoints

### Frontend Application (React)

#### 1. Session View
- Video player/screen share display
- Playback controls (host only)
- Participant list
- Chat interface

#### 2. WebRTC Manager
- Establishes peer connections
- Handles ICE negotiation
- Manages media streams
- Quality adaptation

#### 3. State Management
- Global state with Zustand
- Session state synchronization
- Connection status tracking

## Data Flow

### Session Creation
```
User → Frontend → POST /api/sessions/create
                  ↓
              Backend validates
                  ↓
              Generate session ID
                  ↓
              Store in Redis
                  ↓
              Return session URL
```

### Joining Session
```
User → Frontend → POST /api/sessions/join
                  ↓
              Validate password
                  ↓
              Issue JWT token
                  ↓
              WebSocket upgrade
                  ↓
              Exchange WebRTC signals
                  ↓
              Establish peer connection
```

### Real-time Streaming
```
Host Screen Capture
        ↓
    WebRTC Peer Connection
        ↓
    Direct P2P to Viewers
        (Signaling via Backend WS)
```

## Redis Schema

### Session Data
```
Key: session:{sessionId}
Value: {
  "id": "abc123",
  "name": "Movie Night",
  "host": "user_id",
  "created_at": "timestamp",
  "password_hash": "bcrypt_hash",
  "participants": ["user1", "user2"],
  "max_participants": 10,
  "expires_at": "timestamp"
}
TTL: 24 hours
```

### Active Connections
```
Key: connections:{sessionId}
Value: Set of connection IDs
TTL: 24 hours
```

## Security Considerations

### 1. Authentication
- bcrypt password hashing (cost factor 12)
- JWT with short expiration (1 hour)
- CSRF protection on state-changing operations

### 2. Rate Limiting
- 5 session creation attempts per IP/hour
- 10 join attempts per session/minute
- WebSocket message throttling

### 3. Data Validation
- Input sanitization on all endpoints
- Session ID format validation (UUID v4)
- Password complexity requirements

### 4. Cloudflare Tunnel
- Automatic TLS termination
- DDoS protection
- Geographic routing

## Scalability Strategy

### Horizontal Scaling
- Stateless backend instances
- Redis for shared session state
- Load balancing via Cloudflare

### Vertical Scaling
- Go's efficient concurrency model
- Connection pooling
- Optimized Redis queries

## Monitoring & Logging

### Metrics
- Active sessions count
- Connection success rate
- Average latency
- Error rates by type

### Logs
- Structured JSON logging
- Request/response logging
- Error stack traces
- Performance profiling

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│         Cloudflare Global Network        │
│  ┌─────────────────────────────────┐    │
│  │    Cloudflare Tunnel (TLS)      │    │
│  └──────────────┬──────────────────┘    │
└─────────────────┼───────────────────────┘
                  │
        ┌─────────▼─────────┐
        │   Docker Host     │
        │ ┌───────────────┐ │
        │ │  Go Backend   │ │
        │ │  (Port 8080)  │ │
        │ └───────┬───────┘ │
        │ ┌───────▼───────┐ │
        │ │  Redis        │ │
        │ │  (Port 6379)  │ │
        │ └───────────────┘ │
        └───────────────────┘
```