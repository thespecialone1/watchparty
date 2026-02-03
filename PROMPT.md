# WatchParty Development Prompt for Claude Opus

## Project Overview

You are tasked with building **WatchParty**, a robust real-time screen sharing and watch-along platform. This is a production-grade application that enables users to create private viewing sessions with password protection, share their screen via WebRTC, and collaborate in real-time.

## Technology Stack

**Backend:**
- Language: Go (Golang) for high performance
- Framework: Fiber (Express-like, high-performance HTTP framework)
- WebSocket: gorilla/websocket for real-time bidirectional communication
- Database: Redis for session management and state storage
- Security: JWT authentication, bcrypt password hashing

**Frontend:**
- Framework: React 18 with TypeScript
- UI Library: shadcn/ui components (built on Radix UI)
- Styling: Tailwind CSS
- WebRTC: simple-peer for peer-to-peer connections
- State Management: Zustand
- Build Tool: Vite
- Routing: React Router

**Infrastructure:**
- Cloudflare Tunnel for secure external access
- Docker for containerization
- Redis for in-memory data storage

## Core Requirements

### 1. Session Management
- Users can create watch sessions with custom names and passwords
- Generate unique session IDs (UUID v4)
- Password-protected access with bcrypt hashing (cost factor 12)
- Session data stored in Redis with 24-hour TTL
- Support up to 10 concurrent participants per session
- Real-time participant tracking

### 2. Screen Sharing (WebRTC)
- Host captures screen using `navigator.mediaDevices.getDisplayMedia()`
- Support 1080p @ 30fps minimum
- Peer-to-peer streaming using WebRTC (via simple-peer)
- Backend handles WebRTC signaling (offer/answer/ICE candidates)
- Automatic reconnection on connection drops
- Connection quality monitoring and adaptive bitrate

### 3. Real-time Communication
- WebSocket server for signaling and chat
- Synchronized playback state across all participants
- Real-time chat functionality
- Participant join/leave notifications
- Low-latency message delivery (<100ms)

### 4. Security
- Password hashing with bcrypt
- JWT token authentication (1-hour expiration)
- CORS protection
- Rate limiting (5 session creations/hour per IP, 10 join attempts/minute)
- Input validation and sanitization
- Cloudflare Tunnel for DDoS protection

### 5. User Interface
- Modern, sleek design using shadcn/ui
- Dark theme with purple/slate gradient backgrounds
- Fully responsive (mobile, tablet, desktop)
- Clear connection status indicators
- Real-time participant list
- Intuitive controls and feedback

## Design Philosophy

### Visual Design Principles
1. **Modern & Minimalist**: Clean interfaces with ample whitespace
2. **Dark-First**: Primary dark theme with accent colors
3. **Glass Morphism**: Use subtle backdrop blur effects for cards
4. **Smooth Animations**: Subtle transitions for state changes
5. **Clear Hierarchy**: Typography scale with clear visual hierarchy
6. **Accessibility**: WCAG 2.1 AA compliance

### Color Palette
```css
Primary Background: Linear gradient from slate-900 via purple-900 to slate-900
Card Background: slate-900/50 with backdrop blur
Accent: Purple-500, Violet-500
Success: Green-500
Warning: Yellow-500
Error: Red-500
Text Primary: slate-50
Text Secondary: slate-400
```

### Component Design Patterns
- Use shadcn/ui components as base
- Extend with custom variants using CVA (class-variance-authority)
- Consistent spacing (4px grid system)
- Rounded corners (lg: 12px, md: 8px, sm: 4px)
- Subtle shadows for depth
- Hover states with smooth transitions

### UX Principles
1. **Immediate Feedback**: Show loading states and confirmations
2. **Error Recovery**: Clear error messages with actionable steps
3. **Progressive Disclosure**: Show advanced options only when needed
4. **Contextual Help**: Tooltips and inline help text
5. **Mobile-First**: Design for mobile, enhance for desktop

## Implementation Guidelines

### Backend Architecture

#### File Structure
```
backend/
├── cmd/server/main.go           # Entry point
├── internal/
│   ├── config/config.go         # Configuration
│   ├── handlers/
│   │   ├── session.go           # Session HTTP handlers
│   │   ├── websocket.go         # WebSocket handlers
│   │   └── health.go            # Health checks
│   ├── models/
│   │   ├── session.go           # Data models
│   │   └── message.go           # Message types
│   ├── services/
│   │   ├── session_service.go   # Business logic
│   │   ├── auth_service.go      # Authentication
│   │   └── redis_service.go     # Redis operations
│   ├── middleware/
│   │   ├── auth.go              # JWT validation
│   │   ├── ratelimit.go         # Rate limiting
│   │   └── cors.go              # CORS handling
│   └── utils/
│       ├── crypto.go            # Password hashing
│       └── validation.go        # Input validation
└── pkg/websocket/
    ├── hub.go                   # WebSocket hub
    └── client.go                # Client manager
```

#### Key Patterns
1. **Hub Pattern for WebSockets**: Central hub manages all connections
2. **Service Layer**: Separate business logic from HTTP handlers
3. **Middleware Chain**: Auth → Rate Limit → CORS → Handler
4. **Error Wrapping**: Always wrap errors with context
5. **Structured Logging**: JSON logs with levels

### Frontend Architecture

#### File Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn components
│   │   ├── session/         # Session components
│   │   ├── video/           # Video player
│   │   ├── chat/            # Chat components
│   │   └── layout/          # Layout components
│   ├── hooks/
│   │   ├── useWebSocket.ts  # WebSocket hook
│   │   ├── useWebRTC.ts     # WebRTC hook
│   │   └── useSession.ts    # Session hook
│   ├── store/
│   │   ├── sessionStore.ts  # Session state
│   │   └── chatStore.ts     # Chat state
│   ├── lib/
│   │   ├── api.ts           # API client
│   │   ├── webrtc.ts        # WebRTC utils
│   │   └── utils.ts         # Utilities
│   ├── types/               # TypeScript types
│   └── pages/               # Route pages
```

#### Key Patterns
1. **Custom Hooks**: Encapsulate complex logic
2. **Zustand Stores**: Minimal, focused state slices
3. **Composition**: Build complex UIs from small components
4. **Type Safety**: Strict TypeScript, no `any` types
5. **Error Boundaries**: Catch and handle React errors

### WebRTC Flow

```
1. Host creates session
   ↓
2. Host starts screen capture (getDisplayMedia)
   ↓
3. Viewer joins session (password validation)
   ↓
4. WebSocket connection established
   ↓
5. Host creates RTCPeerConnection with local stream
   ↓
6. Host creates offer → sends via WebSocket
   ↓
7. Viewer receives offer → creates answer
   ↓
8. ICE candidates exchanged via WebSocket
   ↓
9. P2P connection established
   ↓
10. Viewer receives stream → displays video
```

## Critical Implementation Details

### 1. Redis Schema
```
session:{sessionId} → Session JSON (24h TTL)
connections:{sessionId} → Set of connection IDs (24h TTL)
```

### 2. WebSocket Message Types
```typescript
- CHAT: Text messages between participants
- WEBRTC_OFFER: WebRTC offer signal
- WEBRTC_ANSWER: WebRTC answer signal
- ICE_CANDIDATE: ICE candidate for connection
- PLAYBACK_STATE: Sync playback controls
- USER_JOINED: New participant notification
- USER_LEFT: Participant left notification
```

### 3. API Endpoints
```
POST   /api/sessions/create     # Create new session
POST   /api/sessions/join       # Join existing session
GET    /api/sessions/:id        # Get session details
GET    /ws/:sessionId           # WebSocket upgrade
GET    /health                  # Health check
```

### 4. Error Handling
- All errors return consistent JSON structure
- HTTP status codes: 200, 400, 401, 404, 429, 500
- User-friendly error messages
- Detailed server logs for debugging

### 5. Performance Targets
- WebSocket latency: <100ms
- Screen share quality: 1080p @ 30fps
- Connection success rate: >95%
- Support 10+ concurrent viewers
- Redis operations: <10ms

## Specific Component Requirements

### CreateSession Component
- Name input (3-50 characters)
- Password input (min 6 characters, show/hide toggle)
- Validation with clear error messages
- Loading state during creation
- Copy shareable link on success
- Gradient background with glass morphism card

### JoinSession Component
- Session ID from URL params
- Password input with validation
- "Join Session" button with loading state
- Error handling (invalid session, wrong password)
- Redirect to watch room on success

### WatchRoom Component (Main View)
- **Layout**: Grid with video (main) and chat (sidebar)
- **Video Player**: Full screen capability, connection quality indicator
- **Controls**: Play/pause, volume (host only)
- **Participant List**: Avatars with names, online status
- **Chat Panel**: Messages, send input, auto-scroll
- **Leave Button**: Cleanup on exit

### ConnectionQuality Component
- Real-time RTT and packet loss display
- Visual indicator (signal bars)
- Color-coded (green/yellow/red)
- Tooltip with detailed metrics

## Code Quality Standards

### Go Backend
- Follow Effective Go guidelines
- Use `gofmt` for formatting
- Error handling: never ignore errors
- Context for cancellation
- Table-driven tests
- Clear function/variable names

### React Frontend
- Functional components with hooks
- TypeScript strict mode
- ESLint + Prettier
- Meaningful component names
- Props interfaces for all components
- Comments for complex logic

### General
- DRY (Don't Repeat Yourself)
- SOLID principles
- Clear separation of concerns
- Comprehensive error handling
- Security-first mindset

## Testing Requirements

### Backend Tests
- Unit tests for services (>80% coverage)
- Integration tests for HTTP handlers
- WebSocket connection tests
- Redis operations mocking

### Frontend Tests
- Component tests (React Testing Library)
- Hook tests
- Integration tests for user flows
- E2E tests with Playwright

## Documentation Requirements

1. **README.md**: Project overview, setup, usage
2. **API.md**: Complete API documentation
3. **CONTRIBUTING.md**: Development guidelines
4. **Inline Comments**: Complex logic explanation
5. **Type Definitions**: Document all interfaces

## Deployment Checklist

- [ ] Environment variables configured
- [ ] HTTPS enabled (required for screen sharing)
- [ ] Cloudflare Tunnel configured
- [ ] Redis persistence enabled
- [ ] Rate limiting active
- [ ] Error monitoring setup (e.g., Sentry)
- [ ] Logging configured
- [ ] Health checks passing
- [ ] Load testing completed
- [ ] Security audit done

## Success Criteria

1. **Functional**: All features work as specified
2. **Performance**: Meets latency and quality targets
3. **Security**: No vulnerabilities in code
4. **UX**: Intuitive interface, smooth interactions
5. **Code Quality**: Clean, maintainable, well-documented
6. **Responsive**: Works on all screen sizes
7. **Accessible**: WCAG 2.1 AA compliant
8. **Tested**: Comprehensive test coverage

## Development Approach

### Phase 1: Foundation (Days 1-2)
- Setup project structure
- Configure build tools
- Create basic Go server with Fiber
- Setup Redis connection
- Initialize React app with Vite
- Configure shadcn/ui

### Phase 2: Core Features (Days 3-5)
- Implement session management (backend)
- Create session API endpoints
- Build CreateSession & JoinSession pages
- Setup WebSocket server
- Implement authentication

### Phase 3: WebRTC Integration (Days 6-8)
- Implement screen capture
- Setup WebRTC signaling
- Create peer connections
- Build video player component
- Handle connection lifecycle

### Phase 4: Real-time Features (Days 9-10)
- Implement chat functionality
- Add participant tracking
- Sync playback state
- Connection quality monitoring

### Phase 5: Polish & Testing (Days 11-14)
- Refine UI/UX
- Add animations
- Error handling improvements
- Write tests
- Performance optimization
- Documentation

## Important Reminders

1. **Always read the skill files first** before implementing features:
   - `.agent/skills/go-backend/SKILL.md` for backend
   - `.agent/skills/react-frontend/SKILL.md` for frontend
   - `.agent/skills/webrtc/SKILL.md` for WebRTC

2. **Security is paramount**:
   - Never expose JWT secrets
   - Always validate input
   - Use HTTPS in production
   - Implement rate limiting

3. **User experience matters**:
   - Provide clear feedback
   - Handle errors gracefully
   - Show loading states
   - Make it intuitive

4. **Code quality over speed**:
   - Write clean, maintainable code
   - Add comments for complex logic
   - Follow established patterns
   - Test thoroughly

5. **Performance optimization**:
   - Monitor WebSocket latency
   - Optimize video quality adaptively
   - Minimize re-renders
   - Use proper memoization

## Final Notes

This is a production-grade application. Every decision should prioritize:
1. **Security**: Protect user data and prevent abuse
2. **Performance**: Fast, responsive, low-latency
3. **Reliability**: Handle errors, auto-reconnect
4. **Usability**: Intuitive, accessible, delightful
5. **Maintainability**: Clean code, good documentation

Create something that users will love and developers will be proud of.

---

**Ready to build? Start by reviewing the skill files, then begin with Phase 1.**