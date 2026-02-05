import { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { PlaybackControls, PlaybackAction } from '@/components/video/PlaybackControls';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useScreenCapture, getAudioCapabilities } from '@/hooks/useScreenCapture';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { useSessionStore } from '@/store/sessionStore';
import { useConnectionStore } from '@/store/connectionStore';
import { useChatStore } from '@/store/chatStore';
import { MessageType, WebSocketMessage, ChatPayload, UserEventPayload, PlaybackControlPayload } from '@/types/message';
import {
    Mic, MicOff, MonitorUp, MonitorOff,
    MessageSquare, LogOut, Users, Loader2, X, Volume2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Hidden audio element for playing remote voice chat
function RemoteVoiceAudio({ stream }: { stream: MediaStream | null }) {
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (audioRef.current && stream) {
            audioRef.current.srcObject = stream;
            audioRef.current.play().catch(err => {
                console.warn('[RemoteVoice] Autoplay blocked:', err);
            });
        }
    }, [stream]);

    return (
        <audio
            ref={audioRef}
            autoPlay
            playsInline
            className="hidden"
        />
    );
}

export function WatchRoom() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();

    // UI State
    const [participantCount, setParticipantCount] = useState(1);

    const { token, isHost, sessionName, clearSession, addParticipant, removeParticipant, initFromStorage, participants, iceServers } = useSessionStore();
    const { wsConnected, wsReconnecting, remoteStream, remoteVoiceStream, connectionState } = useConnectionStore();
    const { addMessage } = useChatStore();

    // Media hooks
    const { stream: captureStream, isCapturing, startCapture, stopCapture, error: captureError } = useScreenCapture();
    const {
        stream: voiceStream,
        isAudioEnabled,
        startVoiceChat,
        stopVoiceChat,
        toggleAudio,
    } = useVoiceChat();

    // Refs
    const webRTCRef = useRef<ReturnType<typeof useWebRTC> | null>(null);

    // Initialize from localStorage on mount
    useEffect(() => {
        initFromStorage();
    }, [initFromStorage]);

    // Validate session
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (!sessionId || !token) {
                toast.error('Invalid session. Please join again.');
                navigate('/');
            }
        }, 100);
        return () => clearTimeout(timeout);
    }, [sessionId, token, navigate]);

    // Update participant count
    useEffect(() => {
        setParticipantCount(Object.keys(participants).length + 1);
    }, [participants]);

    // Auto-start voice chat on mount
    useEffect(() => {
        const initVoice = async () => {
            console.log('[WatchRoom] Starting voice chat...');
            const stream = await startVoiceChat();
            if (stream) {
                toast.success('Voice chat ready 🎤');
            } else {
                toast.warning('Microphone access denied. You can still watch and listen.');
            }
        };

        // Small delay to ensure session is validated
        const timeout = setTimeout(initVoice, 500);
        return () => clearTimeout(timeout);
    }, [startVoiceChat]);

    // Get user ID from token

    // Get user ID from token
    const getUserIdFromToken = (): string => {
        if (!token) return '';
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.user_id || '';
        } catch {
            return '';
        }
    };

    const getUsernameFromToken = (): string => {
        if (!token) return 'User';
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.username || 'User';
        } catch {
            return 'User';
        }
    };

    const userId = getUserIdFromToken();
    const username = getUsernameFromToken();

    // Handle WebSocket messages
    const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
        switch (message.type) {
            case MessageType.CHAT: {
                const payload = message.payload as ChatPayload;
                addMessage({
                    id: payload.id || crypto.randomUUID(),
                    userId: payload.user_id,
                    username: payload.username,
                    message: payload.message,
                    timestamp: payload.timestamp,
                });
                // Play notification sound
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'); // Simple pop sound
                audio.volume = 0.5;
                audio.play().catch(e => console.log('Audio play failed:', e));
                break;
            }

            case MessageType.USER_JOINED: {
                const payload = message.payload as UserEventPayload;
                addParticipant(payload.user_id, payload.username);
                toast.success(`${payload.username} joined`);

                // Always initiate peer when someone joins (if we're host)
                if (isHost && webRTCRef.current) {
                    console.log('[WatchRoom] User joined, initiating peer connection');
                    webRTCRef.current.initiatePeer(payload.user_id);
                }
                break;
            }

            case MessageType.USER_LEFT: {
                const payload = message.payload as UserEventPayload;
                removeParticipant(payload.user_id);
                toast.info(`${payload.username} left`);

                if (webRTCRef.current) {
                    webRTCRef.current.removePeer(payload.user_id);
                }
                break;
            }

            case MessageType.WEBRTC_OFFER:
            case MessageType.WEBRTC_ANSWER:
            case MessageType.ICE_CANDIDATE: {
                if (webRTCRef.current) {
                    webRTCRef.current.handleSignal(
                        message.user_id,
                        message.payload as { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }
                    );
                }
                break;
            }

            case MessageType.PLAYBACK_CONTROL: {
                const payload = message.payload as PlaybackControlPayload;
                // Don't show toast for own commands
                if (payload.from_user !== userId) {
                    const actionText = payload.action === 'toggle' ? 'toggled'
                        : payload.action === 'seek_forward' ? `skipped +${payload.seek_seconds}s`
                            : payload.action === 'seek_backward' ? `went back ${payload.seek_seconds}s`
                                : payload.action;
                    toast.info(`${payload.from_username} ${actionText}`, { duration: 2000 });
                }
                // TODO: If host, execute the command on the actual video element
                // This requires the video to be in a controlled state
                console.log('[PlaybackControl] Received:', payload);
                break;
            }

            default:
                console.log('Unhandled message type:', message.type);
        }
    }, [addMessage, addParticipant, removeParticipant, isHost, userId]);

    // Setup WebSocket
    const { sendChat, sendSignal, sendPlaybackControl } = useWebSocket({
        sessionId: sessionId || '',
        token: token || '',
        onMessage: handleWebSocketMessage,
        onOpen: () => toast.success('Connected to session'),
        onClose: () => !wsReconnecting && toast.error('Disconnected from session'),
    });

    // Handle playback control
    const handlePlaybackControl = useCallback((action: PlaybackAction, seekSeconds?: number) => {
        sendPlaybackControl(action, userId, username, seekSeconds);
        // Show feedback for own action
        const actionText = action === 'toggle' ? 'Toggled playback'
            : action === 'seek_forward' ? `Skipped +${seekSeconds}s`
                : action === 'seek_backward' ? `Went back ${seekSeconds}s`
                    : action === 'play' ? 'Playing' : 'Paused';
        toast.success(actionText, { duration: 1500 });
    }, [sendPlaybackControl, userId, username]);

    // Setup WebRTC with separate voice and screen streams
    const webRTC = useWebRTC({
        userId,
        isHost,
        voiceStream: voiceStream,
        screenStream: isHost ? captureStream : null,
        sendSignal,
        iceServers,
    });

    webRTCRef.current = webRTC;

    // Handle screen share toggle
    const handleScreenShareToggle = async () => {
        if (isCapturing) {
            stopCapture();
            toast.info('Screen sharing stopped');
        } else {
            try {
                const stream = await startCapture();
                if (stream) {
                    const audioTracks = stream.getAudioTracks();
                    const capabilities = getAudioCapabilities();

                    if (audioTracks.length > 0) {
                        toast.success('Sharing screen with audio 🎵');
                    } else {
                        toast.warning(capabilities.recommendation, { duration: 6000 });
                    }
                }
            } catch (err) {
                const errorMessage = captureError || 'Failed to share screen';
                toast.error(errorMessage);
            }
        }
    };

    // Handle leave session
    const handleLeave = () => {
        if (isCapturing) stopCapture();
        stopVoiceChat();
        webRTC.cleanup();
        clearSession();
        navigate('/');
        toast.info('You have left the session');
    };

    // Determine display stream for main video
    const displayStream = isHost ? captureStream : remoteStream;

    // Check if there are other participants
    const hasRemoteUser = Object.keys(participants).length > 0;

    if (!sessionId || !token) {
        return null;
    }

    // Control button component
    const ControlButton = ({
        active,
        danger,
        highlight,
        onClick,
        children,
        title,
        disabled
    }: {
        active?: boolean;
        danger?: boolean;
        highlight?: boolean;
        onClick: () => void;
        children: React.ReactNode;
        title: string;
        disabled?: boolean;
    }) => (
        <button
            onClick={onClick}
            title={title}
            disabled={disabled}
            className={cn(
                'h-11 w-11 rounded-full flex items-center justify-center transition-all',
                disabled && 'opacity-50 cursor-not-allowed',
                danger
                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                    : highlight
                        ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                        : active === false
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : 'bg-zinc-700/60 hover:bg-zinc-600/60 text-zinc-200'
            )}
        >
            {children}
        </button>
    );

    return (
        <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
            {/* Hidden audio element for remote voice chat */}
            <RemoteVoiceAudio stream={remoteVoiceStream} />

            {/* Header */}
            <header className="flex-shrink-0 px-4 py-2.5 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-900/50">
                <div className="flex items-center gap-3">
                    <h1 className="text-sm font-medium text-zinc-100">
                        {sessionName || 'Watch Party'}
                    </h1>
                    <div className={cn(
                        'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs',
                        wsConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-700/50 text-zinc-400'
                    )}>
                        {wsConnected ? (
                            <>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Live
                            </>
                        ) : wsReconnecting ? (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Reconnecting
                            </>
                        ) : (
                            <span>Offline</span>
                        )}
                    </div>
                    {connectionState === 'connected' && (
                        <div className="px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-400">
                            P2P Connected
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Voice indicator */}
                    {voiceStream && hasRemoteUser && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                            <Volume2 className="w-3 h-3" />
                            Voice Active
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-zinc-400 text-xs">
                        <Users className="w-3.5 h-3.5" />
                        <span>{participantCount}</span>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
                {/* Video area - Top 50% on mobile, Left side on desktop */}
                <div className="flex-shrink-0 h-[40vh] lg:h-auto lg:flex-1 flex flex-col min-h-0 p-2 lg:p-3 bg-black">
                    {/* Main video (shared content) */}
                    <div className="flex-1 min-h-0 relative group rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800/50">
                        {displayStream ? (
                            <>
                                <VideoPlayer
                                    stream={displayStream}
                                    isMuted={isHost}
                                    isLocal={isHost}
                                    className="w-full h-full"
                                />
                                {/* Playback Controls Overlay - Desktop only */}
                                <div className="hidden lg:block absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <div className="bg-zinc-900/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-zinc-700/50">
                                        <PlaybackControls
                                            onControl={handlePlaybackControl}
                                            disabled={!wsConnected}
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center p-6">
                                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-800/50 flex items-center justify-center">
                                        <MonitorUp className="w-6 h-6 text-zinc-500" />
                                    </div>
                                    <p className="text-zinc-300 text-sm font-medium">
                                        {isHost ? 'Share your screen' : 'Waiting for host...'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile: Chat Area (Bottom 60%) */}
                <div className="flex-1 lg:hidden flex flex-col min-h-0 border-t border-zinc-800/50 bg-zinc-900/30">
                    <ChatPanel
                        onSendMessage={(message) => sendChat(message, userId, username)}
                        userId={userId}
                    />
                </div>

                {/* Desktop: Right sidebar */}
                <div className="hidden lg:flex flex-col w-80 border-l border-zinc-800/50 bg-zinc-900/30">
                    {/* Voice chat controls */}
                    <div className="p-4 border-b border-zinc-800/50">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-zinc-300">Voice Chat</h3>
                            {voiceStream && (
                                <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400">
                                    Active
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <ControlButton
                                active={isAudioEnabled}
                                onClick={toggleAudio}
                                title={isAudioEnabled ? 'Mute' : 'Unmute'}
                            >
                                {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                            </ControlButton>

                            {isHost && (
                                <ControlButton
                                    active={!isCapturing}
                                    onClick={handleScreenShareToggle}
                                    title={isCapturing ? 'Stop sharing' : 'Share screen'}
                                >
                                    {isCapturing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
                                </ControlButton>
                            )}

                            <ControlButton danger onClick={handleLeave} title="Leave">
                                <LogOut className="w-5 h-5" />
                            </ControlButton>
                        </div>

                        {/* Status info */}
                        <div className="mt-3 text-xs text-zinc-500">
                            {isAudioEnabled ? (
                                <span className="text-primary">🎤 Mic on</span>
                            ) : (
                                <span>🔇 Mic muted</span>
                            )}
                        </div>
                    </div>

                    {/* Chat panel */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <ChatPanel
                            onSendMessage={(message) => sendChat(message, userId, username)}
                            userId={userId}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
