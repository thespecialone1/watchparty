# WatchParty 🎬

> A robust, real-time screen sharing and watch-along platform built with Go and React

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Go Version](https://img.shields.io/badge/Go-1.21+-00ADD8?logo=go)](https://go.dev/)
[![React Version](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](https://reactjs.org/)

## ✨ Features

- 🔒 **Secure Sessions** - Password-protected watch parties
- 📺 **Screen Sharing** - High-quality WebRTC streaming (1080p @ 30fps)
- 💬 **Real-time Chat** - Communicate with participants
- 🎮 **Playback Controls** - Synchronized viewing experience
- 🌐 **External Access** - Cloudflare Tunnel integration
- 📱 **Responsive Design** - Works on all devices
- ⚡ **High Performance** - Go backend for speed
- 🎨 **Modern UI** - Beautiful shadcn/ui components

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Go 1.21+
- Docker and Docker Compose
- Cloudflare account (optional, for external access)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/watchparty.git
cd watchparty
```

2. **Start Redis**
```bash
docker-compose up -d
```

3. **Setup Backend**
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
go mod download
go run cmd/server/main.go
```

4. **Setup Frontend**
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

5. **Access the app**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080/api

## 📖 Documentation

- [Vision & Architecture](docs/vision.md)
- [API Documentation](docs/api.md)
- [Setup Guide](docs/setup.md)
- [Development Prompt](PROMPT.md)

## 🏗️ Architecture

```
┌─────────────────┐
│   React App     │  ← shadcn/ui, Tailwind, WebRTC
│   (Frontend)    │
└────────┬────────┘
         │ HTTP/WS
         ↓
┌────────────────┐
│ Cloudflare     │  ← Tunnel (optional)
│   Tunnel       │
└────────┬───────┘
         │
         ↓
┌────────────────┐
│  Go Backend    │  ← Fiber, WebSocket, JWT
│    (API)       │
└────────┬───────┘
         │
         ↓
┌────────────────┐
│     Redis      │  ← Session storage
└────────────────┘
```

## 🛠️ Tech Stack

### Backend
- **Language**: Go 1.21+
- **Framework**: Fiber (HTTP/WebSocket)
- **Database**: Redis (session storage)
- **Auth**: JWT + bcrypt
- **Deployment**: Docker

### Frontend
- **Framework**: React 18 + TypeScript
- **UI Library**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **WebRTC**: simple-peer
- **State**: Zustand
- **Build**: Vite

### Infrastructure
- **Tunnel**: Cloudflare
- **Container**: Docker
- **Reverse Proxy**: Cloudflare Tunnel

## 📁 Project Structure

```
watchparty/
├── backend/              # Go backend
│   ├── cmd/             # Application entry points
│   ├── internal/        # Private application code
│   │   ├── config/     # Configuration
│   │   ├── handlers/   # HTTP/WS handlers
│   │   ├── models/     # Data models
│   │   ├── services/   # Business logic
│   │   └── middleware/ # Middleware
│   └── pkg/            # Public libraries
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── hooks/      # Custom hooks
│   │   ├── lib/        # Utilities
│   │   ├── store/      # State management
│   │   └── types/      # TypeScript types
│   └── public/         # Static assets
├── docs/               # Documentation
└── .agent/            # AI skills
    └── skills/
```

## 🎯 Usage

### Creating a Watch Party

1. Click **"Create Watch Party"**
2. Enter a session name
3. Set a password
4. Click **"Create"**
5. Share the generated link with friends

### Joining a Watch Party

1. Open the shared link
2. Enter the password
3. Click **"Join"**
4. Start watching together!

### Screen Sharing (Host)

1. Click **"Share Screen"**
2. Select window/screen to share
3. Click **"Share"**
4. Participants will see your screen

## 🔒 Security

- **Password Protection**: bcrypt hashing (cost 12)
- **JWT Authentication**: 1-hour token expiration
- **Rate Limiting**: Prevents abuse
- **HTTPS**: Required in production
- **Input Validation**: All inputs sanitized
- **CORS**: Configured per environment

## ⚡ Performance

- **Latency**: <100ms WebSocket latency
- **Quality**: 1080p @ 30fps screen sharing
- **Scalability**: Supports 10+ concurrent viewers
- **Reliability**: Automatic reconnection
- **Caching**: Redis for session state

## 🧪 Testing

### Backend Tests
```bash
cd backend
go test ./... -v -cover
```

### Frontend Tests
```bash
cd frontend
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

## 📦 Deployment

### Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment

1. Build backend:
```bash
cd backend
go build -o watchparty-server cmd/server/main.go
./watchparty-server
```

2. Build frontend:
```bash
cd frontend
npm run build
# Serve the dist/ folder with nginx or similar
```

3. Setup Cloudflare Tunnel:
```bash
cloudflared tunnel create watchparty
cloudflared tunnel route dns watchparty watchparty.yourdomain.com
cloudflared tunnel run watchparty
```

## 🌐 Environment Variables

### Backend (.env)
```env
PORT=8080
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=
JWT_SECRET=your-secret-key
ENVIRONMENT=production
ALLOWED_ORIGINS=https://watchparty.yourdomain.com
```

### Frontend (.env)
```env
VITE_API_URL=https://watchparty.yourdomain.com/api
VITE_WS_URL=wss://watchparty.yourdomain.com
```

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Fiber](https://gofiber.io/) - Fast HTTP framework for Go
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [simple-peer](https://github.com/feross/simple-peer) - WebRTC wrapper
- [Cloudflare](https://www.cloudflare.com/) - Tunnel and CDN services

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/thespecialone1/watchparty/issues)
- **Email**: support@watchparty.com
- **Docs**: https://watchparty.yourdomain.com/docs

## 🗺️ Roadmap

- [ ] Recording functionality
- [ ] Virtual backgrounds
- [ ] Screen annotation tools
- [ ] Multi-host support
- [ ] Mobile apps (React Native)
- [ ] Analytics dashboard
- [ ] Public session directory
- [ ] Integration with streaming platforms

## ⭐ Star History

If you find this project useful, please consider giving it a star!

---

Built with ❤️ using Go and React