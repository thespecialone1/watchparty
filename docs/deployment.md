# Deployment & Public Access

To share your WatchParty with friends over the internet, you need to expose your local server. We recommend using **Cloudflare Tunnel** (cloudflared) as it's secure and free.

## Option 1: Cloudflare Tunnel (Recommended)

1.  **Install `cloudflared`**:
    *   **macOS**: `brew install cloudflared`
    *   **Windows**: Download from [Cloudflare](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)
    *   **Linux**: Use your package manager.

2.  **Start the Tunnel**:
    Run the following command in your terminal to expose your frontend port (5173):
    ```bash
    cloudflared tunnel --url http://localhost:5173
    ```

3.  **Share the Link**:
    Cloudflare will generate a random URL (e.g., `https://random-name.trycloudflare.com`).
    *   Copy this URL.
    *   Share it with your friends.
    *   **Important**: Since the backend runs on port 8080, and the frontend proxies `/api` and `/ws` requests, this usually works fine if the frontend proxy is configured correctly.
    *   **However**, for best results in production, you might need to tunnel both or use a reverse proxy like Nginx, or configure `cloudflared` with a configuration file to route `/api` to `8080` and `/` to `5173`.

### Simple Dev Tunnel (Frontend Only)
If you just tunnel port 5173, the frontend will load, but it might try to connect to `ws://localhost:8080` (which is your machine, not theirs).
**Correction**: The frontend is configured to proxy `/api` and `/ws` to `localhost:8080` *via the Vite Dev Server*.
So, tunneling port **5173** is sufficient! The requests go:
`User Browser` -> `Cloudflare` -> `Your Laptop (5173)` -> `Vite Proxy` -> `Your Laptop (8080)`.

**Note**: You must be running `npm run dev` and `go run cmd/server/main.go` for this to work.

## Option 2: Ngrok

Authentication is required for Ngrok these days, but it works similarly:
```bash
ngrok http 5173
```

## Production Build

To run in production mode:
1.  Build frontend: `cd frontend && npm run build`
2.  Serve frontend using a static file server or embed in Go backend (requires code changes).
