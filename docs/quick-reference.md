# Developer Quick Reference Guide

## 🚀 Quick Commands

### Start Development Environment
```bash
# Terminal 1 - Redis
docker-compose up

# Terminal 2 - Backend
cd backend && go run cmd/server/main.go

# Terminal 3 - Frontend
cd frontend && npm run dev

# Terminal 4 - Cloudflare Tunnel (optional)
cloudflared tunnel run watchparty
```

### Install Dependencies
```bash
# Backend
cd backend
go mod download

# Frontend
cd frontend
npm install
```

### Build for Production
```bash
# Backend
cd backend
go build -o watchparty-server cmd/server/main.go

# Frontend
cd frontend
npm run build
```

## 📋 Common Tasks

### Add a New API Endpoint

1. **Define model** in `backend/internal/models/`
```go
type MyModel struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}
```

2. **Create service** in `backend/internal/services/`
```go
func (s *MyService) DoSomething(ctx context.Context) error {
    // Business logic here
}
```

3. **Add handler** in `backend/internal/handlers/`
```go
func (h *MyHandler) HandleRequest(c *fiber.Ctx) error {
    // HTTP handling
    return c.JSON(response)
}
```

4. **Register route** in `cmd/server/main.go`
```go
api.Get("/my-endpoint", myHandler.HandleRequest)
```

### Add a New React Component

1. **Create component** in `frontend/src/components/`
```tsx
// MyComponent.tsx
import { Card } from '@/components/ui/card';

export function MyComponent() {
  return <Card>Content</Card>;
}
```

2. **Add types** in `frontend/src/types/`
```typescript
export interface MyComponentProps {
  title: string;
}
```

3. **Use in page** in `frontend/src/pages/`
```tsx
import { MyComponent } from '@/components/MyComponent';

export function MyPage() {
  return <MyComponent title="Hello" />;
}
```

### Add a shadcn/ui Component
```bash
npx shadcn-ui@latest add [component-name]

# Examples:
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
```

### Add a WebSocket Message Type

1. **Define type** in `backend/internal/models/message.go`
```go
const (
    MessageTypeMyEvent = "my_event"
)
```

2. **Handle in WebSocket handler**
```go
case MessageTypeMyEvent:
    // Handle event
    h.hub.BroadcastToSession(sessionID, message)
```

3. **Add frontend type** in `frontend/src/types/message.ts`
```typescript
export enum MessageType {
  MY_EVENT = 'my_event',
}
```

4. **Handle in React** via `useWebSocket` hook
```typescript
const handleMessage = (msg: WebSocketMessage) => {
  if (msg.type === MessageType.MY_EVENT) {
    // Handle event
  }
};
```

## 🎨 Styling Quick Reference

### Tailwind Classes (Common Patterns)

```tsx
// Card with gradient background
<Card className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">

// Glass morphism effect
<div className="bg-slate-900/50 backdrop-blur-lg">

// Button variations
<Button variant="default">Primary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Tertiary</Button>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Flex layouts
<div className="flex items-center justify-between">
<div className="flex flex-col gap-4">

// Animations
<div className="transition-all duration-300 hover:scale-105">
<div className="animate-pulse">
```

### Color Palette
```css
/* Background */
bg-slate-900      /* Main background */
bg-slate-800      /* Card background */
bg-slate-700      /* Hover states */

/* Accent */
bg-purple-500     /* Primary accent */
bg-violet-500     /* Secondary accent */

/* Text */
text-slate-50     /* Primary text */
text-slate-400    /* Secondary text */
text-slate-500    /* Tertiary text */

/* Status */
bg-green-500      /* Success */
bg-yellow-500     /* Warning */
bg-red-500        /* Error */
```

## 🔧 Environment Configuration

### Development (.env)
```env
# Backend
PORT=8080
REDIS_ADDR=localhost:6379
JWT_SECRET=dev-secret-change-in-prod
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:5173

# Frontend
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080
```

### Production (.env.production)
```env
# Backend
PORT=8080
REDIS_ADDR=redis:6379
JWT_SECRET=<generate-with-openssl-rand-base64-32>
ENVIRONMENT=production
ALLOWED_ORIGINS=https://watchparty.yourdomain.com

# Frontend
VITE_API_URL=https://watchparty.yourdomain.com/api
VITE_WS_URL=wss://watchparty.yourdomain.com
```

## 🐛 Debugging

### Backend Debugging
```bash
# Run with verbose logging
LOG_LEVEL=debug go run cmd/server/main.go

# Profile CPU
go run cmd/server/main.go -cpuprofile=cpu.prof

# Profile memory
go run cmd/server/main.go -memprofile=mem.prof

# View profile
go tool pprof cpu.prof
```

### Frontend Debugging
```bash
# React DevTools
# Install browser extension

# Network debugging
# Browser DevTools → Network tab

# WebSocket debugging
# Browser DevTools → Network → WS filter

# Performance profiling
# Browser DevTools → Performance tab
```

### Redis Debugging
```bash
# Connect to Redis
docker-compose exec redis redis-cli

# View all keys
KEYS *

# Get session data
GET session:550e8400-e29b-41d4-a716-446655440000

# Monitor commands
MONITOR

# View memory usage
INFO memory
```

## 📊 Testing

### Unit Tests (Backend)
```bash
# Run all tests
go test ./...

# Run with coverage
go test ./... -cover

# Run specific package
go test ./internal/services/...

# Verbose output
go test ./... -v
```

### Component Tests (Frontend)
```bash
# Run tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Update snapshots
npm run test -- -u
```

### Integration Tests
```bash
# Run E2E tests
npm run test:e2e

# Run in headed mode
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

## 🔍 Common Issues & Solutions

### Issue: WebSocket connection fails
**Solution:**
1. Check backend is running
2. Verify WebSocket URL in `.env`
3. Check browser console for errors
4. Ensure CORS is configured correctly

### Issue: Screen sharing doesn't work
**Solution:**
1. Use HTTPS in production (required for `getDisplayMedia`)
2. Check browser permissions
3. Try different browser (Chrome recommended)
4. Verify WebRTC configuration

### Issue: Redis connection refused
**Solution:**
```bash
# Check if Redis is running
docker-compose ps

# Restart Redis
docker-compose restart redis

# Check logs
docker-compose logs redis
```

### Issue: Build fails
**Solution:**
```bash
# Backend
cd backend
go mod tidy
go clean -cache

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## 📝 Code Snippets

### Create Zustand Store
```typescript
import { create } from 'zustand';

interface MyStore {
  count: number;
  increment: () => void;
}

export const useMyStore = create<MyStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

### Custom React Hook
```typescript
import { useState, useEffect } from 'react';

export function useMyHook() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Setup
    return () => {
      // Cleanup
    };
  }, []);
  
  return { data };
}
```

### API Call with Error Handling
```typescript
try {
  const response = await api.createSession({ name, password });
  toast.success('Session created!');
  navigate(`/watch/${response.id}`);
} catch (error) {
  if (axios.isAxiosError(error)) {
    toast.error(error.response?.data?.message || 'Failed to create session');
  } else {
    toast.error('An unexpected error occurred');
  }
}
```

### Go HTTP Handler
```go
func (h *Handler) HandleRequest(c *fiber.Ctx) error {
    var req RequestModel
    if err := c.BodyParser(&req); err != nil {
        return c.Status(400).JSON(fiber.Map{
            "error": "Invalid request",
        })
    }
    
    result, err := h.service.DoSomething(c.Context(), &req)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{
            "error": "Internal server error",
        })
    }
    
    return c.JSON(result)
}
```

## 🎯 Performance Tips

### Backend
- Use connection pooling for Redis
- Implement proper context cancellation
- Use buffered channels for high throughput
- Profile with pprof regularly
- Cache frequently accessed data

### Frontend
- Lazy load routes with `React.lazy()`
- Memoize expensive computations with `useMemo`
- Prevent unnecessary re-renders with `React.memo`
- Debounce user input
- Use virtual scrolling for large lists

### WebRTC
- Implement adaptive bitrate
- Monitor connection quality
- Use TURN servers in production
- Handle reconnection gracefully
- Cleanup peer connections properly

## 📚 Useful Resources

### Documentation
- [Go Fiber](https://docs.gofiber.io/)
- [Redis](https://redis.io/docs/)
- [React](https://react.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [WebRTC](https://webrtc.org/)

### Tools
- [Redis Commander](http://joeferner.github.io/redis-commander/) - Redis GUI
- [Postman](https://www.postman.com/) - API testing
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Cloudflare Dashboard](https://dash.cloudflare.com/)

### Keyboard Shortcuts

**VS Code:**
- `Ctrl/Cmd + P` - Quick file open
- `Ctrl/Cmd + Shift + P` - Command palette
- `Ctrl/Cmd + B` - Toggle sidebar
- `Ctrl/Cmd + /` - Toggle comment
- `F12` - Go to definition
- `Shift + F12` - Find references

**Browser DevTools:**
- `F12` - Open DevTools
- `Ctrl/Cmd + Shift + C` - Inspect element
- `Ctrl/Cmd + Shift + M` - Toggle device toolbar
- `Ctrl/Cmd + Shift + I` - Open console

## 🔐 Security Checklist

- [ ] JWT secret is strong and not committed
- [ ] Passwords are hashed with bcrypt (cost 12+)
- [ ] HTTPS enabled in production
- [ ] CORS configured for specific origins
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (if using SQL)
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Security headers configured

## 📦 Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations run (if applicable)
- [ ] Redis persistence enabled
- [ ] Cloudflare Tunnel configured
- [ ] SSL certificate valid
- [ ] Health checks passing
- [ ] Monitoring setup
- [ ] Logging configured
- [ ] Backup strategy in place
- [ ] Load testing completed

---

**Need help?** Check the [main documentation](../README.md) or open an issue on GitHub.