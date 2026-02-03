# WebRTC Integration Skill

## Purpose
This skill provides comprehensive guidance for implementing WebRTC screen sharing and real-time communication in WatchParty.

## When to Use This Skill
- Implementing screen sharing
- Setting up peer-to-peer video/audio
- Building real-time collaboration features
- Handling WebRTC signaling
- Managing ICE candidates and STUN/TURN servers

## WebRTC Architecture for WatchParty

```
┌─────────────┐                           ┌─────────────┐
│   Host      │                           │   Viewer    │
│  (Screen    │                           │  (Receives  │
│   Share)    │                           │   Stream)   │
└──────┬──────┘                           └──────┬──────┘
       │                                         │
       │  1. Get Screen Capture                 │
       │     (getUserMedia/getDisplayMedia)     │
       │                                         │
       │  2. Create Peer Connection             │
       │◄───────────────┬────────────────────────┤
       │                │                        │
       │  3. Add Stream to Peer                 │
       │                │                        │
       │  4. Create Offer                       │
       ├────────────────┼───────────────────────►│
       │                │  WebSocket Signal      │
       │                │  (via Backend)         │
       │  5. Create Answer                      │
       │◄───────────────┼────────────────────────┤
       │                │                        │
       │  6. Exchange ICE Candidates            │
       │◄───────────────┼───────────────────────►│
       │                │                        │
       │  7. P2P Connection Established         │
       │◄═══════════════════════════════════════►│
       │         Direct Media Stream             │
       └─────────────────────────────────────────┘
```

## Screen Capture Implementation

### Host Side - Capturing Screen

```typescript
// src/hooks/useScreenCapture.ts
import { useState, useCallback } from 'react';

interface ScreenCaptureOptions {
  audio?: boolean;
  video?: {
    width?: number;
    height?: number;
    frameRate?: number;
  };
}

export const useScreenCapture = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCapture = useCallback(async (options: ScreenCaptureOptions = {}) => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
          ...options.video,
        },
        audio: options.audio || false,
      });

      // Handle when user stops sharing via browser UI
      mediaStream.getVideoTracks()[0].addEventListener('ended', () => {
        stopCapture();
      });

      setStream(mediaStream);
      setIsCapturing(true);
      setError(null);
      
      return mediaStream;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to capture screen';
      setError(errorMessage);
      setIsCapturing(false);
      return null;
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCapturing(false);
    }
  }, [stream]);

  const switchSource = useCallback(async (options: ScreenCaptureOptions = {}) => {
    stopCapture();
    return await startCapture(options);
  }, [startCapture, stopCapture]);

  return {
    stream,
    isCapturing,
    error,
    startCapture,
    stopCapture,
    switchSource,
  };
};
```

### Viewer Side - Receiving Stream

```typescript
// src/hooks/useRemoteStream.ts
import { useState, useCallback } from 'react';

export const useRemoteStream = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReceiving, setIsReceiving] = useState(false);

  const handleStream = useCallback((remoteStream: MediaStream) => {
    setStream(remoteStream);
    setIsReceiving(true);
  }, []);

  const clearStream = useCallback(() => {
    setStream(null);
    setIsReceiving(false);
  }, []);

  return {
    stream,
    isReceiving,
    handleStream,
    clearStream,
  };
};
```

## Complete WebRTC Hook

```typescript
// src/hooks/useWebRTC.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import SimplePeer from 'simple-peer';
import { MessageType, WebSocketMessage } from '@/types/message';

interface UseWebRTCOptions {
  sessionId: string;
  isHost: boolean;
  localStream?: MediaStream;
  onRemoteStream: (stream: MediaStream) => void;
  sendSignal: (message: WebSocketMessage) => void;
}

interface PeerConnection {
  id: string;
  peer: SimplePeer.Instance;
  userId: string;
}

export const useWebRTC = ({
  sessionId,
  isHost,
  localStream,
  onRemoteStream,
  sendSignal,
}: UseWebRTCOptions) => {
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const [connectionStates, setConnectionStates] = useState<Map<string, RTCPeerConnectionState>>(new Map());

  // ICE server configuration
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Add TURN servers for production
    // {
    //   urls: 'turn:your-turn-server.com:3478',
    //   username: 'username',
    //   credential: 'password',
    // },
  ];

  // Create peer connection
  const createPeer = useCallback((userId: string, initiator: boolean) => {
    const peer = new SimplePeer({
      initiator,
      trickle: true,
      stream: localStream,
      config: {
        iceServers,
      },
    });

    // Handle signaling
    peer.on('signal', (signal) => {
      const messageType = signal.type === 'offer' 
        ? MessageType.WEBRTC_OFFER 
        : MessageType.WEBRTC_ANSWER;

      sendSignal({
        type: messageType,
        payload: signal,
        sessionId,
        userId,
        timestamp: Date.now(),
      });
    });

    // Handle remote stream
    peer.on('stream', (stream) => {
      console.log(`Received stream from ${userId}`);
      onRemoteStream(stream);
    });

    // Handle connection state changes
    peer.on('connect', () => {
      console.log(`Connected to ${userId}`);
      setConnectionStates(prev => new Map(prev).set(userId, 'connected'));
    });

    peer.on('close', () => {
      console.log(`Connection closed with ${userId}`);
      setConnectionStates(prev => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
      peersRef.current.delete(userId);
    });

    peer.on('error', (err) => {
      console.error(`Peer error with ${userId}:`, err);
      setConnectionStates(prev => new Map(prev).set(userId, 'failed'));
    });

    const peerConnection: PeerConnection = {
      id: Math.random().toString(36).substr(2, 9),
      peer,
      userId,
    };

    peersRef.current.set(userId, peerConnection);
    setConnectionStates(prev => new Map(prev).set(userId, 'connecting'));

    return peer;
  }, [localStream, sessionId, sendSignal, onRemoteStream]);

  // Handle incoming signals
  const handleSignal = useCallback((userId: string, signal: SimplePeer.SignalData) => {
    const peerConnection = peersRef.current.get(userId);

    if (peerConnection) {
      // Existing peer - just add the signal
      peerConnection.peer.signal(signal);
    } else {
      // New peer - create it as non-initiator
      const peer = createPeer(userId, false);
      peer.signal(signal);
    }
  }, [createPeer]);

  // Add a new peer (for host when viewer joins)
  const addPeer = useCallback((userId: string) => {
    if (!peersRef.current.has(userId)) {
      createPeer(userId, isHost);
    }
  }, [createPeer, isHost]);

  // Remove peer
  const removePeer = useCallback((userId: string) => {
    const peerConnection = peersRef.current.get(userId);
    if (peerConnection) {
      peerConnection.peer.destroy();
      peersRef.current.delete(userId);
      setConnectionStates(prev => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    }
  }, []);

  // Cleanup all peers
  const cleanup = useCallback(() => {
    peersRef.current.forEach((peerConnection) => {
      peerConnection.peer.destroy();
    });
    peersRef.current.clear();
    setConnectionStates(new Map());
  }, []);

  // Update local stream for all peers
  useEffect(() => {
    if (localStream) {
      peersRef.current.forEach((peerConnection) => {
        // Remove old tracks
        const sender = peerConnection.peer._pc
          ?.getSenders()
          .find(s => s.track?.kind === 'video');
        
        if (sender) {
          const videoTrack = localStream.getVideoTracks()[0];
          if (videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        }
      });
    }
  }, [localStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    addPeer,
    removePeer,
    handleSignal,
    cleanup,
    connectionStates,
    peerCount: peersRef.current.size,
  };
};
```

## Signaling Server Messages

### Message Types

```typescript
// src/types/webrtc.ts
export interface WebRTCSignal {
  type: 'offer' | 'answer' | 'candidate';
  sdp?: string;
  candidate?: RTCIceCandidateInit;
}

export interface SignalingMessage {
  type: 'webrtc_offer' | 'webrtc_answer' | 'ice_candidate';
  from: string;
  to: string;
  signal: WebRTCSignal;
  sessionId: string;
}
```

### Backend WebSocket Handler (Go)

```go
// internal/handlers/websocket.go
package handlers

import (
    "encoding/json"
    "github.com/gofiber/websocket/v2"
    "yourapp/pkg/websocket"
)

type SignalingMessage struct {
    Type      string          `json:"type"`
    From      string          `json:"from"`
    To        string          `json:"to"`
    Signal    json.RawMessage `json:"signal"`
    SessionID string          `json:"session_id"`
}

func (h *WebSocketHandler) HandleWebSocket(c *websocket.Conn) {
    client := &websocket.Client{
        Conn:      c,
        Send:      make(chan []byte, 256),
        SessionID: c.Params("sessionId"),
        UserID:    c.Locals("userId").(string),
    }

    h.hub.Register(client)
    defer h.hub.Unregister(client)

    // Read messages
    go func() {
        for {
            _, message, err := c.ReadMessage()
            if err != nil {
                break
            }

            var msg SignalingMessage
            if err := json.Unmarshal(message, &msg); err != nil {
                continue
            }

            // Forward signaling messages
            switch msg.Type {
            case "webrtc_offer", "webrtc_answer", "ice_candidate":
                h.hub.SendToUser(msg.To, message)
            default:
                h.hub.BroadcastToSession(msg.SessionID, message)
            }
        }
    }()

    // Write messages
    for message := range client.Send {
        if err := c.WriteMessage(websocket.TextMessage, message); err != nil {
            break
        }
    }
}
```

## Quality Adaptation

```typescript
// src/hooks/useAdaptiveQuality.ts
import { useEffect, useState } from 'react';

interface QualityMetrics {
  bandwidth: number;
  packetLoss: number;
  jitter: number;
  rtt: number;
}

interface QualityLevel {
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
}

const QUALITY_LEVELS: QualityLevel[] = [
  { width: 1920, height: 1080, frameRate: 30, bitrate: 2500 },
  { width: 1280, height: 720, frameRate: 30, bitrate: 1500 },
  { width: 854, height: 480, frameRate: 25, bitrate: 800 },
  { width: 640, height: 360, frameRate: 20, bitrate: 400 },
];

export const useAdaptiveQuality = (
  peerConnection: RTCPeerConnection | null
) => {
  const [currentQuality, setCurrentQuality] = useState<QualityLevel>(QUALITY_LEVELS[0]);
  const [metrics, setMetrics] = useState<QualityMetrics>({
    bandwidth: 0,
    packetLoss: 0,
    jitter: 0,
    rtt: 0,
  });

  useEffect(() => {
    if (!peerConnection) return;

    const interval = setInterval(async () => {
      const stats = await peerConnection.getStats();
      
      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          const bandwidth = report.bytesReceived * 8 / 1000; // kbps
          const packetLoss = report.packetsLost / report.packetsReceived;
          const jitter = report.jitter;

          setMetrics({
            bandwidth,
            packetLoss: packetLoss || 0,
            jitter: jitter || 0,
            rtt: report.roundTripTime || 0,
          });

          // Adjust quality based on metrics
          if (packetLoss > 0.05 || bandwidth < currentQuality.bitrate * 0.8) {
            // Downgrade quality
            const currentIndex = QUALITY_LEVELS.indexOf(currentQuality);
            if (currentIndex < QUALITY_LEVELS.length - 1) {
              setCurrentQuality(QUALITY_LEVELS[currentIndex + 1]);
            }
          } else if (bandwidth > currentQuality.bitrate * 1.5 && packetLoss < 0.01) {
            // Upgrade quality
            const currentIndex = QUALITY_LEVELS.indexOf(currentQuality);
            if (currentIndex > 0) {
              setCurrentQuality(QUALITY_LEVELS[currentIndex - 1]);
            }
          }
        }
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [peerConnection, currentQuality]);

  return { currentQuality, metrics };
};
```

## Connection Quality Indicator

```typescript
// src/components/video/ConnectionQuality.tsx
import { Signal, SignalHigh, SignalLow, SignalMedium } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ConnectionQualityProps {
  rtt: number;
  packetLoss: number;
}

export function ConnectionQuality({ rtt, packetLoss }: ConnectionQualityProps) {
  const getQuality = () => {
    if (packetLoss > 0.05 || rtt > 200) {
      return { level: 'poor', icon: SignalLow, color: 'destructive' };
    }
    if (packetLoss > 0.02 || rtt > 100) {
      return { level: 'fair', icon: SignalMedium, color: 'warning' };
    }
    return { level: 'excellent', icon: SignalHigh, color: 'success' };
  };

  const quality = getQuality();
  const Icon = quality.icon;

  return (
    <Badge variant={quality.color as any} className="gap-1">
      <Icon className="h-3 w-3" />
      {quality.level}
    </Badge>
  );
}
```

## Best Practices

### 1. Error Handling
- Always handle getUserMedia rejections
- Implement fallback for unsupported browsers
- Show clear error messages to users
- Log errors for debugging

### 2. Performance
- Use adaptive bitrate based on connection quality
- Implement quality scaling
- Monitor bandwidth usage
- Cleanup resources properly

### 3. Security
- Use DTLS-SRTP for encryption
- Validate signaling messages
- Implement proper authentication
- Use TURN servers for NAT traversal

### 4. User Experience
- Show connection status clearly
- Provide quality indicators
- Handle disconnections gracefully
- Implement auto-reconnect

### 5. Browser Compatibility
- Test on Chrome, Firefox, Safari, Edge
- Provide polyfills if needed
- Handle browser-specific quirks
- Show compatibility warnings

## TURN Server Setup (Production)

```bash
# Install coturn
sudo apt-get install coturn

# Configure /etc/turnserver.conf
listening-port=3478
external-ip=YOUR_SERVER_IP
realm=watchparty.com
server-name=watchparty.com
lt-cred-mech
user=username:password
no-tcp-relay
```

## Troubleshooting

### Connection Fails
1. Check STUN/TURN server configuration
2. Verify firewall rules (UDP ports)
3. Test ICE candidate gathering
4. Check NAT type

### Poor Quality
1. Monitor bandwidth usage
2. Check packet loss
3. Verify codec support
4. Test on different networks

### Audio Echo
1. Enable echo cancellation
2. Mute local audio for viewers
3. Use headphones
4. Adjust audio constraints

## Testing WebRTC

```typescript
// Test ICE connectivity
const testICE = async () => {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('ICE candidate:', event.candidate);
    } else {
      console.log('ICE gathering complete');
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
};
```