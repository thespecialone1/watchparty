# WatchParty API Documentation

## Base URL
```
Development: http://localhost:8080/api
Production: https://watchparty.yourdomain.com/api
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### Health Check

#### GET /health
Check if the server is running.

**Response**
```json
{
  "status": "ok"
}
```

---

### Session Management

#### POST /api/sessions/create
Create a new watch party session.

**Request Body**
```json
{
  "name": "Movie Night",
  "password": "secure123"
}
```

**Validation**
- `name`: Required, 3-50 characters
- `password`: Required, minimum 6 characters

**Response** (200 OK)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Movie Night",
  "share_url": "https://watchparty.yourdomain.com/join/550e8400-e29b-41d4-a716-446655440000",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**
- `400 Bad Request`: Invalid input
  ```json
  {
    "error": "Validation failed",
    "details": {
      "name": "Name must be between 3 and 50 characters",
      "password": "Password must be at least 6 characters"
    }
  }
  ```

- `429 Too Many Requests`: Rate limit exceeded
  ```json
  {
    "error": "Rate limit exceeded",
    "message": "Maximum 5 session creations per hour"
  }
  ```

---

#### POST /api/sessions/join
Join an existing session.

**Request Body**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "password": "secure123"
}
```

**Response** (200 OK)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Movie Night",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**
- `404 Not Found`: Session does not exist
  ```json
  {
    "error": "Session not found",
    "message": "The session you're trying to join doesn't exist or has expired"
  }
  ```

- `401 Unauthorized`: Invalid password
  ```json
  {
    "error": "Authentication failed",
    "message": "Invalid password"
  }
  ```

- `403 Forbidden`: Session is full
  ```json
  {
    "error": "Session full",
    "message": "This session has reached the maximum number of participants"
  }
  ```

---

#### GET /api/sessions/:id
Get session details (requires authentication).

**Headers**
```
Authorization: Bearer <token>
```

**Response** (200 OK)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Movie Night",
  "host_id": "user_123",
  "participants": [
    "user_123",
    "user_456",
    "user_789"
  ],
  "max_participants": 10,
  "created_at": "2026-02-02T10:30:00Z",
  "expires_at": "2026-02-03T10:30:00Z"
}
```

**Error Responses**
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Session not found

---

### WebSocket Connection

#### GET /ws/:sessionId
Establish WebSocket connection for real-time communication.

**Query Parameters**
- `token`: JWT token (required)

**Example**
```javascript
const ws = new WebSocket('ws://localhost:8080/ws/550e8400-e29b-41d4-a716-446655440000?token=eyJhbG...');
```

**Connection Flow**
1. Client sends connection request with token
2. Server validates token
3. Server upgrades connection to WebSocket
4. Client is added to session hub
5. Bi-directional messaging begins

---

## WebSocket Messages

All WebSocket messages follow this format:

```typescript
interface WebSocketMessage {
  type: MessageType;
  payload: any;
  session_id: string;
  user_id: string;
  timestamp: number;
}
```

### Message Types

#### CHAT
Send/receive chat messages.

**Client → Server**
```json
{
  "type": "chat",
  "payload": {
    "message": "Hello everyone!"
  },
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user_123",
  "timestamp": 1706872200000
}
```

**Server → Client** (broadcast to all)
```json
{
  "type": "chat",
  "payload": {
    "id": "msg_abc123",
    "user_id": "user_123",
    "username": "John Doe",
    "message": "Hello everyone!",
    "timestamp": 1706872200000
  },
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user_123",
  "timestamp": 1706872200000
}
```

---

#### WEBRTC_OFFER
WebRTC offer signal from host.

**Client → Server**
```json
{
  "type": "webrtc_offer",
  "payload": {
    "type": "offer",
    "sdp": "v=0\r\no=- 1234567890 2 IN IP4 127.0.0.1\r\n..."
  },
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "host_user",
  "timestamp": 1706872200000
}
```

**Server → Target Client**
```json
{
  "type": "webrtc_offer",
  "payload": {
    "type": "offer",
    "sdp": "v=0\r\no=- 1234567890 2 IN IP4 127.0.0.1\r\n..."
  },
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "host_user",
  "timestamp": 1706872200000
}
```

---

#### WEBRTC_ANSWER
WebRTC answer signal from viewer.

**Client → Server**
```json
{
  "type": "webrtc_answer",
  "payload": {
    "type": "answer",
    "sdp": "v=0\r\no=- 9876543210 2 IN IP4 127.0.0.1\r\n..."
  },
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "viewer_user",
  "timestamp": 1706872205000
}
```

---

#### ICE_CANDIDATE
ICE candidate for WebRTC connection.

**Client → Server**
```json
{
  "type": "ice_candidate",
  "payload": {
    "candidate": "candidate:1 1 UDP 2130706431 192.168.1.100 54321 typ host",
    "sdpMid": "0",
    "sdpMLineIndex": 0
  },
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user_123",
  "timestamp": 1706872210000
}
```

---

#### PLAYBACK_STATE
Synchronize playback controls (host only).

**Client → Server** (host only)
```json
{
  "type": "playback_state",
  "payload": {
    "playing": true,
    "currentTime": 125.5,
    "volume": 0.8
  },
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "host_user",
  "timestamp": 1706872215000
}
```

**Server → Clients** (broadcast)
```json
{
  "type": "playback_state",
  "payload": {
    "playing": true,
    "currentTime": 125.5,
    "volume": 0.8
  },
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "host_user",
  "timestamp": 1706872215000
}
```

---

#### USER_JOINED
Notification when a user joins.

**Server → Clients** (broadcast)
```json
{
  "type": "user_joined",
  "payload": {
    "user_id": "user_456",
    "username": "Jane Smith"
  },
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user_456",
  "timestamp": 1706872220000
}
```

---

#### USER_LEFT
Notification when a user leaves.

**Server → Clients** (broadcast)
```json
{
  "type": "user_left",
  "payload": {
    "user_id": "user_456",
    "username": "Jane Smith"
  },
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user_456",
  "timestamp": 1706872225000
}
```

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/sessions/create | 5 requests | 1 hour per IP |
| POST /api/sessions/join | 10 requests | 1 minute per session |
| WebSocket messages | 100 messages | 1 minute per connection |

**Rate Limit Headers**
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1706875800
```

---

## Error Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid input or malformed request |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not allowed |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Server temporarily unavailable |

**Standard Error Response**
```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": {} // Optional additional details
}
```

---

## CORS Configuration

**Allowed Origins** (configurable)
- `http://localhost:5173` (development)
- `https://watchparty.yourdomain.com` (production)

**Allowed Methods**
- GET, POST, PUT, DELETE, OPTIONS

**Allowed Headers**
- Content-Type, Authorization

**Credentials**
- Allowed: true

---

## WebSocket Lifecycle

### Connection
1. Client initiates WebSocket connection with token
2. Server validates token
3. Server upgrades to WebSocket
4. Client added to session hub
5. Server sends USER_JOINED to all participants

### Messaging
1. Client sends message via WebSocket
2. Server validates message format
3. Server processes message based on type
4. Server broadcasts/forwards as appropriate

### Disconnection
1. Client closes connection or times out
2. Server detects disconnection
3. Server removes client from hub
4. Server broadcasts USER_LEFT to remaining participants
5. Server cleans up resources

### Reconnection
1. Client detects disconnection
2. Client attempts reconnection with exponential backoff
3. Server validates and re-establishes connection
4. Client re-joins session state

---

## Security

### Authentication
- JWT tokens with HS256 signing
- Token expiration: 1 hour
- Refresh tokens: Not implemented (create new session)

### Password Requirements
- Minimum length: 6 characters
- Hashing: bcrypt with cost factor 12
- Storage: Only hashed passwords stored

### HTTPS
- Required in production
- TLS 1.2+ only
- Valid SSL certificate

### Input Validation
- All inputs sanitized
- Type checking on all fields
- Length limits enforced
- XSS prevention

---

## WebRTC Configuration

### ICE Servers
```javascript
{
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // TURN servers for production
    {
      urls: 'turn:turn.watchparty.com:3478',
      username: 'user',
      credential: 'pass'
    }
  ]
}
```

### Media Constraints
```javascript
{
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 }
  },
  audio: false // Screen sharing typically doesn't include audio
}
```

---

## Testing the API

### Using cURL

**Create Session**
```bash
curl -X POST http://localhost:8080/api/sessions/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Session",
    "password": "test123"
  }'
```

**Join Session**
```bash
curl -X POST http://localhost:8080/api/sessions/join \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "password": "test123"
  }'
```

**Get Session**
```bash
curl -X GET http://localhost:8080/api/sessions/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Using Postman

1. Import collection from `/docs/postman_collection.json`
2. Set environment variables:
   - `base_url`: http://localhost:8080
   - `token`: (obtained from create/join response)
3. Run requests

---

## Changelog

### v1.0.0 (2026-02-02)
- Initial API release
- Session management endpoints
- WebSocket real-time communication
- WebRTC signaling support
- JWT authentication
- Rate limiting

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/yourusername/watchparty/issues
- Documentation: https://watchparty.yourdomain.com/docs
- Email: support@watchparty.com