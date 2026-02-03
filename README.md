# WatchParty

A real-time screen sharing application with voice chat.

## Features
- 🖥️ Screen sharing in high quality
- 🎤 Voice chat (audio-only)
- 💬 Real-time text chat
- 🎮 Synchronized playback controls
- 🔒 Password-protected sessions

---

## Development (Local)

### Prerequisites
- Go 1.21+
- Node.js 20+
- Redis

### Run Backend
```bash
cd backend
go run cmd/server/main.go
```

### Run Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Production Deployment (Linux Server)

### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Go
sudo apt install golang-go -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y

# Install Redis
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### 2. Clone Repository

```bash
cd /home/ubuntu
git clone https://github.com/thespecialone1/watchparty.git
cd watchparty
```

### 3. Build Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### 4. Build Backend

```bash
cd backend
go build -o watchparty ./cmd/server
```

### 5. Configure Environment

Create `.env` file in the backend folder:

```bash
cd backend
cat > .env << EOF
PORT=8080
REDIS_URL=localhost:6379
JWT_SECRET=your-super-secret-key-change-this
ENABLE_TUNNEL=false
ALLOWED_ORIGINS=https://yourdomain.com
EOF
```

### 6. Run the Server

```bash
# From the backend folder
./watchparty
```

You should see:
```
Connected to Redis
Serving frontend from: ../frontend/dist
Starting WatchParty server on port 8080
```

### 7. Access the App

Open `http://your-server-ip:8080` in your browser.

---

## Running with systemd (Auto-start)

Create service file:

```bash
sudo nano /etc/systemd/system/watchparty.service
```

Paste this:

```ini
[Unit]
Description=WatchParty Server
After=network.target redis-server.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/watchparty/backend
ExecStart=/home/ubuntu/watchparty/backend/watchparty
Restart=always
RestartSec=5
Environment=PORT=8080
Environment=REDIS_URL=localhost:6379
Environment=JWT_SECRET=your-super-secret-key
Environment=ENABLE_TUNNEL=false

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable watchparty
sudo systemctl start watchparty
sudo systemctl status watchparty
```

---

## Using with Nginx (HTTPS)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## License

MIT