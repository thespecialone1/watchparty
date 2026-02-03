# WatchParty Setup Guide

## Prerequisites

- Node.js 18+ and npm/pnpm
- Go 1.21+
- Docker and Docker Compose
- Git
- Cloudflare account (for tunnel)

## Quick Start

### 1. Clone and Setup

```bash
# Create project directory
mkdir watchparty
cd watchparty

# Initialize git
git init

# Create directory structure
mkdir -p backend frontend docs .agent/skills
```

### 2. Backend Setup (Go)

```bash
# Navigate to backend
cd backend

# Initialize Go module
go mod init github.com/yourusername/watchparty

# Install dependencies
go get github.com/gofiber/fiber/v2
go get github.com/gofiber/websocket/v2
go get github.com/redis/go-redis/v9
go get github.com/golang-jwt/jwt/v5
go get github.com/google/uuid
go get golang.org/x/crypto
go get github.com/joho/godotenv

# Create .env file
cat > .env << EOL
PORT=8080
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=
JWT_SECRET=$(openssl rand -base64 32)
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:5173
EOL

# Run backend
go run cmd/server/main.go
```

### 3. Frontend Setup (React)

```bash
# Navigate to frontend
cd ../frontend

# Create Vite React app with TypeScript
npm create vite@latest . -- --template react-ts

# Install dependencies
npm install

# Install shadcn/ui dependencies
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p

npm install class-variance-authority clsx tailwind-merge
npm install lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-slot
npm install sonner

# Initialize shadcn/ui
npx shadcn-ui@latest init

# Add shadcn components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add scroll-area
npx shadcn-ui@latest add label

# Install additional dependencies
npm install zustand
npm install simple-peer
npm install @types/simple-peer -D
npm install axios
npm install react-router-dom

# Create .env file
cat > .env << EOL
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080
EOL

# Run frontend
npm run dev
```

### 4. Redis Setup (Docker)

```bash
# Navigate to project root
cd ..

# Create docker-compose.yml
cat > docker-compose.yml << EOL
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  redis_data:
EOL

# Start Redis
docker-compose up -d
```

### 5. Cloudflare Tunnel Setup

```bash
# Install cloudflared
# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Authenticate with Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create watchparty

# Note the tunnel ID from output

# Create config file
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << EOL
tunnel: YOUR_TUNNEL_ID
credentials-file: /path/to/YOUR_TUNNEL_ID.json

ingress:
  - hostname: watchparty.yourdomain.com
    service: http://localhost:8080
  - service: http_status:404
EOL

# Run tunnel (in separate terminal)
cloudflared tunnel run watchparty

# Route DNS
cloudflared tunnel route dns watchparty watchparty.yourdomain.com
```

## Development Workflow

### Start All Services

```bash
# Terminal 1 - Redis
docker-compose up

# Terminal 2 - Backend
cd backend
go run cmd/server/main.go

# Terminal 3 - Frontend
cd frontend
npm run dev

# Terminal 4 - Cloudflare Tunnel (optional for external access)
cloudflared tunnel run watchparty
```

### Access the Application

- **Local Frontend**: http://localhost:5173
- **Local Backend API**: http://localhost:8080/api
- **WebSocket**: ws://localhost:8080/ws
- **External (via Tunnel)**: https://watchparty.yourdomain.com

## Project Structure

```
watchparty/
├── .agent/
│   └── skills/
│       ├── go-backend/
│       │   └── SKILL.md
│       ├── react-frontend/
│       │   └── SKILL.md
│       └── webrtc/
│           └── SKILL.md
├── backend/
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   ├── internal/
│   │   ├── config/
│   │   ├── handlers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── services/
│   │   └── utils/
│   ├── pkg/
│   │   └── websocket/
│   ├── go.mod
│   ├── go.sum
│   ├── Dockerfile
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── .env
├── docs/
│   ├── vision.md
│   ├── architecture.md
│   └── api.md
├── docker-compose.yml
└── README.md
```

## Testing

### Backend Tests

```bash
cd backend
go test ./... -v
```

### Frontend Tests

```bash
cd frontend
npm run test
```

## Building for Production

### Backend

```bash
cd backend

# Build binary
go build -o watchparty-server cmd/server/main.go

# Or build Docker image
docker build -t watchparty-backend .
```

### Frontend

```bash
cd frontend

# Build static files
npm run build

# Preview production build
npm run preview
```

## Deployment

### Using Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - REDIS_ADDR=redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - ENVIRONMENT=production
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  redis_data:
```

```bash
# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## Environment Variables

### Backend (.env)

```env
PORT=8080
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=
JWT_SECRET=your-secret-key-change-in-production
SESSION_TTL=86400
MAX_PARTICIPANTS=10
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:5173,https://watchparty.yourdomain.com
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080
```

## Troubleshooting

### Redis Connection Failed
```bash
# Check if Redis is running
docker-compose ps

# View Redis logs
docker-compose logs redis

# Restart Redis
docker-compose restart redis
```

### WebSocket Connection Failed
- Check firewall settings
- Verify CORS configuration
- Check WebSocket URL format
- Test with browser dev tools

### Screen Sharing Not Working
- Ensure HTTPS in production (required for getDisplayMedia)
- Check browser permissions
- Test on different browsers
- Verify WebRTC configuration

### Build Errors

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

## Monitoring

### Backend Health Check

```bash
curl http://localhost:8080/health
```

### Redis Health Check

```bash
docker-compose exec redis redis-cli ping
```

### View Logs

```bash
# Backend logs
tail -f backend/logs/app.log

# Docker logs
docker-compose logs -f
```

## Security Checklist

- [ ] Change default JWT secret
- [ ] Enable HTTPS in production
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Use strong passwords for sessions
- [ ] Enable Redis password
- [ ] Keep dependencies updated
- [ ] Use TURN server for production
- [ ] Implement session timeout
- [ ] Add request validation

## Performance Optimization

- [ ] Enable Redis persistence
- [ ] Configure connection pooling
- [ ] Implement caching
- [ ] Optimize WebRTC settings
- [ ] Use CDN for static assets
- [ ] Enable Gzip compression
- [ ] Monitor resource usage
- [ ] Set up auto-scaling

## Next Steps

1. Implement user authentication
2. Add recording functionality
3. Implement virtual backgrounds
4. Add screen annotation tools
5. Create analytics dashboard
6. Set up monitoring (Prometheus/Grafana)
7. Implement rate limiting
8. Add tests
9. Set up CI/CD pipeline
10. Create user documentation