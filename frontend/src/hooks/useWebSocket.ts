import { useEffect, useRef, useCallback, useState } from 'react';
import { WebSocketMessage, MessageType } from '@/types/message';
import { useConnectionStore } from '@/store/connectionStore';

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
    const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();
    const reconnectAttempts = useRef(0);
    const [isConnecting, setIsConnecting] = useState(false);

    const { setWsConnected, setWsReconnecting } = useConnectionStore();

    // Use refs for callbacks to ensure stable effect dependencies
    const onMessageRef = useRef(onMessage);
    const onOpenRef = useRef(onOpen);
    const onCloseRef = useRef(onClose);
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onMessageRef.current = onMessage;
        onOpenRef.current = onOpen;
        onCloseRef.current = onClose;
        onErrorRef.current = onError;
    }, [onMessage, onOpen, onClose, onError]);

    const connect = useCallback(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            return;
        }

        if (!sessionId || !token) {
            return;
        }

        setIsConnecting(true);

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Use direct backend URL if configured, otherwise falls back to window.location (for proxy)
        const wsHost = import.meta.env.VITE_WS_URL || `${wsProtocol}//${window.location.host}`;
        const wsUrl = `${wsHost}/ws/${sessionId}?token=${encodeURIComponent(token)}`;

        console.log('Connecting to WebSocket:', wsUrl);
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            console.log('WebSocket connected');
            setIsConnecting(false);
            reconnectAttempts.current = 0;
            setWsConnected(true);
            setWsReconnecting(false);
            onOpenRef.current?.();
        };

        ws.current.onmessage = (event) => {
            try {
                const message: WebSocketMessage = JSON.parse(event.data);
                onMessageRef.current?.(message);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        ws.current.onerror = (error) => {
            console.error('WebSocket error:', error);
            setIsConnecting(false);
            onErrorRef.current?.(error);
        };

        ws.current.onclose = (event) => {
            console.log(`WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}, WasClean: ${event.wasClean}`);
            setIsConnecting(false);
            setWsConnected(false);
            onCloseRef.current?.();

            // Attempt reconnection with exponential backoff
            if (reconnectAttempts.current < 5) {
                setWsReconnecting(true);
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
                console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);

                reconnectTimeout.current = setTimeout(() => {
                    reconnectAttempts.current++;
                    connect();
                }, delay);
            } else {
                setWsReconnecting(false);
                console.error('Max reconnection attempts reached');
            }
        };
    }, [sessionId, token, setWsConnected, setWsReconnecting]);

    const sendMessage = useCallback((message: Omit<WebSocketMessage, 'timestamp'>) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            const fullMessage: WebSocketMessage = {
                ...message,
                timestamp: Date.now(),
            };
            ws.current.send(JSON.stringify(fullMessage));
        } else {
            console.warn('WebSocket not connected, cannot send message');
        }
    }, []);

    const sendChat = useCallback((text: string, userId: string, username: string) => {
        sendMessage({
            type: MessageType.CHAT,
            payload: {
                id: crypto.randomUUID(),
                user_id: userId,
                username,
                message: text,
                timestamp: Date.now(),
            },
            session_id: sessionId,
            user_id: userId,
        });
    }, [sendMessage, sessionId]);

    const sendSignal = useCallback((
        type: MessageType.WEBRTC_OFFER | MessageType.WEBRTC_ANSWER | MessageType.ICE_CANDIDATE,
        payload: unknown,
        userId: string,
        targetId?: string
    ) => {
        sendMessage({
            type,
            payload,
            session_id: sessionId,
            user_id: userId,
            target_id: targetId,
        });
    }, [sendMessage, sessionId]);

    const sendPlaybackControl = useCallback((
        action: 'play' | 'pause' | 'toggle' | 'seek_forward' | 'seek_backward',
        userId: string,
        username: string,
        seekSeconds?: number
    ) => {
        sendMessage({
            type: MessageType.PLAYBACK_CONTROL,
            payload: {
                action,
                seek_seconds: seekSeconds || 10,
                from_user: userId,
                from_username: username,
            },
            session_id: sessionId,
            user_id: userId,
        });
    }, [sendMessage, sessionId]);

    const disconnect = useCallback(() => {
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
        }
        reconnectAttempts.current = 5; // Prevent reconnection
        if (ws.current) {
            ws.current.onclose = null; // Remove handler to prevent reconnect trigger
            ws.current.close();
        }
        setWsConnected(false);
        setWsReconnecting(false);
    }, [setWsConnected, setWsReconnecting]);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return {
        sendMessage,
        sendChat,
        sendSignal,
        sendPlaybackControl,
        disconnect,
        isConnecting,
    };
};
