# React Frontend with shadcn/ui Skill

## Purpose
This skill provides guidelines for building modern, performant React applications with shadcn/ui components, TypeScript, and WebRTC for WatchParty.

## When to Use This Skill
- Building React applications with TypeScript
- Implementing shadcn/ui components
- Setting up WebRTC connections
- Real-time state management
- Creating responsive, modern UIs

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   ├── session/
│   │   │   ├── CreateSession.tsx
│   │   │   ├── JoinSession.tsx
│   │   │   └── SessionView.tsx
│   │   ├── video/
│   │   │   ├── VideoPlayer.tsx
│   │   │   ├── VideoControls.tsx
│   │   │   └── ParticipantsList.tsx
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   └── ChatInput.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── Layout.tsx
│   ├── hooks/
│   │   ├── useWebSocket.ts
│   │   ├── useWebRTC.ts
│   │   ├── useSession.ts
│   │   └── useMediaStream.ts
│   ├── store/
│   │   ├── sessionStore.ts
│   │   ├── chatStore.ts
│   │   └── connectionStore.ts
│   ├── lib/
│   │   ├── api.ts
│   │   ├── webrtc.ts
│   │   ├── websocket.ts
│   │   └── utils.ts
│   ├── types/
│   │   ├── session.ts
│   │   ├── message.ts
│   │   └── webrtc.ts
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── CreateSession.tsx
│   │   ├── JoinSession.tsx
│   │   └── WatchRoom.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── components.json          # shadcn/ui config
└── .env.example
```

## Core Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.1",
    "zustand": "^4.4.7",
    "simple-peer": "^9.11.1",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.303.0",
    "sonner": "^1.3.1",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-slot": "^1.0.2",
    "axios": "^1.6.5"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.11",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.33"
  }
}
```

## Setup shadcn/ui

```bash
# Initialize shadcn/ui
npx shadcn-ui@latest init

# Add components as needed
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add separator
```

## Code Patterns

### 1. Type Definitions

```typescript
// src/types/session.ts
export interface Session {
  id: string;
  name: string;
  hostId: string;
  participants: string[];
  maxParticipants: number;
  createdAt: string;
  expiresAt: string;
}

export interface CreateSessionRequest {
  name: string;
  password: string;
}

export interface JoinSessionRequest {
  sessionId: string;
  password: string;
}

// src/types/message.ts
export enum MessageType {
  CHAT = 'chat',
  WEBRTC_OFFER = 'webrtc_offer',
  WEBRTC_ANSWER = 'webrtc_answer',
  ICE_CANDIDATE = 'ice_candidate',
  PLAYBACK_STATE = 'playback_state',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
}

export interface WebSocketMessage {
  type: MessageType;
  payload: any;
  sessionId: string;
  userId: string;
  timestamp: number;
}
```

### 2. Zustand Store

```typescript
// src/store/sessionStore.ts
import { create } from 'zustand';
import { Session } from '@/types/session';

interface SessionState {
  currentSession: Session | null;
  isHost: boolean;
  participants: Map<string, { id: string; username: string }>;
  
  setSession: (session: Session) => void;
  setIsHost: (isHost: boolean) => void;
  addParticipant: (id: string, username: string) => void;
  removeParticipant: (id: string) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  currentSession: null,
  isHost: false,
  participants: new Map(),
  
  setSession: (session) => set({ currentSession: session }),
  setIsHost: (isHost) => set({ isHost }),
  
  addParticipant: (id, username) => set((state) => {
    const participants = new Map(state.participants);
    participants.set(id, { id, username });
    return { participants };
  }),
  
  removeParticipant: (id) => set((state) => {
    const participants = new Map(state.participants);
    participants.delete(id);
    return { participants };
  }),
  
  clearSession: () => set({
    currentSession: null,
    isHost: false,
    participants: new Map(),
  }),
}));

// src/store/chatStore.ts
import { create } from 'zustand';
import { ChatMessage } from '@/types/message';

interface ChatState {
  messages: ChatMessage[];
  unreadCount: number;
  
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  resetUnreadCount: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  unreadCount: 0,
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
    unreadCount: state.unreadCount + 1,
  })),
  
  clearMessages: () => set({ messages: [], unreadCount: 0 }),
  resetUnreadCount: () => set({ unreadCount: 0 }),
}));
```

### 3. Custom Hooks

```typescript
// src/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback } from 'zustand';
import { WebSocketMessage, MessageType } from '@/types/message';

interface UseWebSocketOptions {
  sessionId: string;
  token: string;
  onMessage: (message: WebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

export const useWebSocket = ({
  sessionId,
  token,
  onMessage,
  onOpen,
  onClose,
  onError,
}: UseWebSocketOptions) => {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    const wsUrl = `${import.meta.env.VITE_WS_URL}/ws/${sessionId}?token=${token}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      reconnectAttempts.current = 0;
      onOpen?.();
    };

    ws.current.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        onMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      onError?.(error);
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      onClose?.();

      // Attempt reconnection with exponential backoff
      if (reconnectAttempts.current < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
        reconnectTimeout.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      }
    };
  }, [sessionId, token, onMessage, onOpen, onClose, onError]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    ws.current?.close();
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { sendMessage, disconnect };
};

// src/hooks/useWebRTC.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import SimplePeer from 'simple-peer';
import { MessageType, WebSocketMessage } from '@/types/message';

interface UseWebRTCOptions {
  isInitiator: boolean;
  onStream: (stream: MediaStream) => void;
  sendSignal: (message: WebSocketMessage) => void;
}

export const useWebRTC = ({ isInitiator, onStream, sendSignal }: UseWebRTCOptions) => {
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const [connectionState, setConnectionState] = useState<'new' | 'connecting' | 'connected' | 'failed'>('new');

  const createPeer = useCallback((stream?: MediaStream) => {
    const peer = new SimplePeer({
      initiator: isInitiator,
      trickle: true,
      stream: stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    peer.on('signal', (signal) => {
      sendSignal({
        type: signal.type === 'offer' ? MessageType.WEBRTC_OFFER : MessageType.WEBRTC_ANSWER,
        payload: signal,
        sessionId: '',
        userId: '',
        timestamp: Date.now(),
      });
    });

    peer.on('stream', (remoteStream) => {
      setConnectionState('connected');
      onStream(remoteStream);
    });

    peer.on('connect', () => {
      setConnectionState('connected');
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      setConnectionState('failed');
    });

    peer.on('close', () => {
      setConnectionState('new');
    });

    peerRef.current = peer;
    setConnectionState('connecting');

    return peer;
  }, [isInitiator, onStream, sendSignal]);

  const handleSignal = useCallback((signal: SimplePeer.SignalData) => {
    if (peerRef.current) {
      peerRef.current.signal(signal);
    }
  }, []);

  const destroy = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    setConnectionState('new');
  }, []);

  return {
    createPeer,
    handleSignal,
    destroy,
    connectionState,
  };
};
```

### 4. Component Examples

```typescript
// src/components/session/CreateSession.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function CreateSession() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await api.createSession({ name, password });
      toast.success('Session created successfully!');
      
      // Store token in localStorage
      localStorage.setItem('session_token', response.token);
      
      // Navigate to watch room
      navigate(`/watch/${response.id}`);
    } catch (error) {
      toast.error('Failed to create session');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Watch Party</CardTitle>
          <CardDescription>
            Start a new session and invite your friends
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Session Name</Label>
            <Input
              id="name"
              placeholder="Movie Night"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter a secure password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleCreate} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Creating...' : 'Create Session'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// src/components/video/VideoPlayer.tsx
import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';

interface VideoPlayerProps {
  stream: MediaStream | null;
  isMuted?: boolean;
}

export function VideoPlayer({ stream, isMuted = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <Card className="overflow-hidden bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        className="w-full h-auto aspect-video"
      />
    </Card>
  );
}

// src/components/chat/ChatPanel.tsx
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { ChatMessage } from './ChatMessage';

interface ChatPanelProps {
  onSendMessage: (message: string) => void;
}

export function ChatPanel({ onSendMessage }: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const messages = useChatStore((state) => state.messages);
  const resetUnreadCount = useChatStore((state) => state.resetUnreadCount);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    resetUnreadCount();
  }, [resetUnreadCount]);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
          </div>
        </ScrollArea>
        <div className="p-4 border-t flex gap-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <Button onClick={handleSend} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 5. API Client

```typescript
// src/lib/api.ts
import axios from 'axios';
import { CreateSessionRequest, JoinSessionRequest } from '@/types/session';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('session_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  createSession: async (data: CreateSessionRequest) => {
    const response = await apiClient.post('/sessions/create', data);
    return response.data;
  },

  joinSession: async (data: JoinSessionRequest) => {
    const response = await apiClient.post('/sessions/join', data);
    return response.data;
  },

  getSession: async (sessionId: string) => {
    const response = await apiClient.get(`/sessions/${sessionId}`);
    return response.data;
  },
};
```

## Best Practices

### 1. Component Design
- Keep components small and focused
- Use composition over inheritance
- Implement proper TypeScript typing
- Use React.memo for expensive components
- Extract reusable logic into custom hooks

### 2. State Management
- Use Zustand for global state
- Keep component state local when possible
- Avoid prop drilling with proper store design
- Use selectors to prevent unnecessary re-renders

### 3. Performance
- Lazy load routes with React.lazy
- Optimize re-renders with useMemo/useCallback
- Use proper key props in lists
- Implement virtual scrolling for large lists
- Debounce expensive operations

### 4. Styling
- Use Tailwind utility classes
- Leverage shadcn/ui variants
- Keep consistent spacing (4px grid)
- Use CSS variables for theming
- Implement dark mode support

### 5. WebRTC Best Practices
- Always cleanup peer connections
- Handle connection failures gracefully
- Implement reconnection logic
- Show connection quality indicators
- Mute local audio to prevent feedback

## Environment Variables

```env
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080
```

## Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // ... shadcn/ui color variables
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

## Common Pitfalls to Avoid

1. **Not cleaning up WebRTC connections** - Always destroy peers in useEffect cleanup
2. **Memory leaks from event listeners** - Remove listeners in cleanup functions
3. **Not handling WebSocket reconnection** - Implement exponential backoff
4. **Prop drilling** - Use Zustand or Context for deeply nested state
5. **Not optimizing re-renders** - Use React DevTools Profiler
6. **Ignoring accessibility** - Use semantic HTML and ARIA labels

## Testing Approach

```typescript
// Example test with Vitest
import { render, screen } from '@testing-library/react';
import { CreateSession } from '@/components/session/CreateSession';

describe('CreateSession', () => {
  it('renders create session form', () => {
    render(<CreateSession />);
    expect(screen.getByText('Create Watch Party')).toBeInTheDocument();
  });
});
```

## Deployment

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Serve with nginx or similar
```