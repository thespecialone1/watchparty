import { useEffect, useRef, useCallback, useState } from 'react';
import { MessageType } from '@/types/message';
import { useConnectionStore } from '@/store/connectionStore';

interface UseWebRTCOptions {
    userId: string;
    isHost: boolean;
    voiceStream: MediaStream | null;  // Microphone audio
    screenStream: MediaStream | null; // Screen share (video + optional audio)
    iceServers?: RTCIceServer[];
    sendSignal: (
        type: MessageType.WEBRTC_OFFER | MessageType.WEBRTC_ANSWER | MessageType.ICE_CANDIDATE,
        payload: unknown,
        userId: string,
        targetId?: string
    ) => void;
}

interface PeerConnection {
    peer: RTCPeerConnection;
    targetUserId: string;
    makingOffer: boolean;
    ignoreOffer: boolean;
}

// Default public STUN servers so it works even if backend fails
const defaultIceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
];

export const useWebRTC = ({
    userId,
    isHost,
    voiceStream,
    screenStream,
    sendSignal,
    iceServers: customIceServers,
}: UseWebRTCOptions) => {
    const peersRef = useRef<Map<string, PeerConnection>>(new Map());
    const voiceStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const { setConnectionState, setRemoteStream, setRemoteVoiceStream, connectionState } = useConnectionStore();
    const [peerCount, setPeerCount] = useState(0);

    // Prepare ICE servers configuration
    const iceConfig: RTCConfiguration = {
        iceServers: customIceServers && customIceServers.length > 0
            ? customIceServers
            : defaultIceServers
    };

    // Keep stream refs in sync
    useEffect(() => {
        voiceStreamRef.current = voiceStream;
    }, [voiceStream]);

    useEffect(() => {
        screenStreamRef.current = screenStream;
    }, [screenStream]);

    // Create or get peer connection
    const getOrCreatePeer = useCallback((targetUserId: string): RTCPeerConnection => {
        const existing = peersRef.current.get(targetUserId);
        if (existing) {
            return existing.peer;
        }

        console.log(`[WebRTC] Creating peer for ${targetUserId}`);
        const peer = new RTCPeerConnection(iceConfig);

        const peerConnection: PeerConnection = {
            peer,
            targetUserId,
            makingOffer: false,
            ignoreOffer: false,
        };

        // Handle ICE candidates
        peer.onicecandidate = (event) => {
            if (event.candidate) {
                console.log(`[WebRTC] Sending ICE candidate to ${targetUserId}`);
                sendSignal(MessageType.ICE_CANDIDATE, { candidate: event.candidate }, userId, targetUserId);
            }
        };

        // Handle incoming tracks
        peer.ontrack = (event) => {
            console.log(`[WebRTC] Received ${event.track.kind} track from ${targetUserId}, label: "${event.track.label}"`);

            if (event.streams[0]) {
                const stream = event.streams[0];
                const videoTracks = stream.getVideoTracks();
                const audioTracks = stream.getAudioTracks();

                console.log(`[WebRTC] Stream received - Video: ${videoTracks.length}, Audio: ${audioTracks.length}`);

                // If it has video, it's the screen share stream
                if (videoTracks.length > 0) {
                    console.log('[WebRTC] Setting remote screen stream');
                    setRemoteStream(stream);
                } else if (audioTracks.length > 0 && videoTracks.length === 0) {
                    // Audio-only stream is voice chat
                    console.log('[WebRTC] Setting remote voice stream');
                    setRemoteVoiceStream(stream);
                }
            }
        };

        // Handle connection state changes
        peer.onconnectionstatechange = () => {
            console.log(`[WebRTC] Connection state with ${targetUserId}: ${peer.connectionState}`);
            switch (peer.connectionState) {
                case 'connected':
                    setConnectionState('connected');
                    break;
                case 'disconnected':
                    console.log(`[WebRTC] Peer ${targetUserId} disconnected, attempting recovery...`);
                    break;
                case 'closed':
                    peersRef.current.delete(targetUserId);
                    setPeerCount(peersRef.current.size);
                    if (peersRef.current.size === 0) {
                        setConnectionState('disconnected');
                        setRemoteStream(null);
                        setRemoteVoiceStream(null);
                    }
                    break;
                case 'failed':
                    console.error(`[WebRTC] Connection to ${targetUserId} failed`);
                    setConnectionState('failed');
                    peer.restartIce();
                    break;
            }
        };

        // Handle ICE connection state
        peer.oniceconnectionstatechange = () => {
            console.log(`[WebRTC] ICE connection state: ${peer.iceConnectionState}`);
            if (peer.iceConnectionState === 'failed') {
                console.log('[WebRTC] ICE failed, restarting...');
                peer.restartIce();
            }
        };

        // Handle negotiation needed
        peer.onnegotiationneeded = async () => {
            const pc = peersRef.current.get(targetUserId);
            if (!pc) return;

            try {
                pc.makingOffer = true;
                console.log(`[WebRTC] Negotiation needed with ${targetUserId}, creating offer`);
                await peer.setLocalDescription();
                if (peer.localDescription) {
                    sendSignal(MessageType.WEBRTC_OFFER, { sdp: peer.localDescription }, userId, targetUserId);
                }
            } catch (err) {
                console.error('[WebRTC] Error during negotiation:', err);
            } finally {
                pc.makingOffer = false;
            }
        };

        peersRef.current.set(targetUserId, peerConnection);
        setPeerCount(peersRef.current.size);
        setConnectionState('connecting');

        return peer;
    }, [userId, sendSignal, setConnectionState, setRemoteStream, setRemoteVoiceStream, iceConfig]);

    // Update all tracks on a peer connection
    const updatePeerTracks = useCallback((peer: RTCPeerConnection) => {
        const senders = peer.getSenders();
        const voice = voiceStreamRef.current;
        const screen = screenStreamRef.current;

        console.log(`[WebRTC] Updating tracks - Voice: ${voice?.getAudioTracks().length ?? 0}, Screen: ${screen?.getTracks().length ?? 0}`);

        // Collect all tracks we want to send
        const tracksToSend: { track: MediaStreamTrack; stream: MediaStream }[] = [];

        // Add voice audio track
        if (voice) {
            voice.getAudioTracks().forEach(track => {
                tracksToSend.push({ track, stream: voice });
            });
        }

        // Add screen share tracks (video and audio)
        if (screen) {
            screen.getTracks().forEach(track => {
                tracksToSend.push({ track, stream: screen });
            });
        }

        // Add or replace tracks
        tracksToSend.forEach(({ track, stream }) => {
            const existingSender = senders.find(s =>
                s.track?.kind === track.kind &&
                s.track?.id === track.id
            );

            if (existingSender) {
                // Track already exists, replace if different
                if (existingSender.track !== track) {
                    console.log(`[WebRTC] Replacing ${track.kind} track (${track.label})`);
                    existingSender.replaceTrack(track).catch(err => {
                        console.error(`[WebRTC] Failed to replace track:`, err);
                    });
                }
            } else {
                // Check if there's already a sender for this kind
                const kindSender = senders.find(s => s.track?.kind === track.kind && !tracksToSend.some(t => t.track.id === s.track?.id));

                if (kindSender && track.kind === 'video') {
                    // Replace existing video sender
                    console.log(`[WebRTC] Replacing existing ${track.kind} sender with new track`);
                    kindSender.replaceTrack(track).catch(err => {
                        console.error(`[WebRTC] Failed to replace track:`, err);
                    });
                } else {
                    // Add new track
                    console.log(`[WebRTC] Adding new ${track.kind} track (${track.label})`);
                    try {
                        peer.addTrack(track, stream);
                    } catch (err) {
                        console.error(`[WebRTC] Failed to add track:`, err);
                    }
                }
            }
        });

        // Remove tracks that are no longer needed
        senders.forEach(sender => {
            if (sender.track) {
                const shouldKeep = tracksToSend.some(t => t.track.id === sender.track?.id);
                if (!shouldKeep) {
                    console.log(`[WebRTC] Removing orphan ${sender.track.kind} track`);
                    peer.removeTrack(sender);
                }
            }
        });
    }, []);

    // Effect to update tracks when streams change
    useEffect(() => {
        console.log(`[WebRTC] Streams changed - Voice: ${voiceStream ? 'yes' : 'no'}, Screen: ${screenStream ? 'yes' : 'no'}`);

        peersRef.current.forEach((pc) => {
            updatePeerTracks(pc.peer);
        });
    }, [voiceStream, screenStream, updatePeerTracks]);

    // Handle incoming signaling messages
    const handleSignal = useCallback(async (
        fromUserId: string,
        signal: { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }
    ) => {
        try {
            const peer = getOrCreatePeer(fromUserId);
            const pc = peersRef.current.get(fromUserId);
            if (!pc) return;

            if (signal.sdp) {
                const offerCollision = signal.sdp.type === 'offer' &&
                    (pc.makingOffer || peer.signalingState !== 'stable');

                pc.ignoreOffer = !isHost && offerCollision;

                if (pc.ignoreOffer) {
                    console.log('[WebRTC] Ignoring colliding offer (we are not polite)');
                    return;
                }

                console.log(`[WebRTC] Received ${signal.sdp.type} from ${fromUserId}`);
                await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));

                // Add our local tracks
                updatePeerTracks(peer);

                if (signal.sdp.type === 'offer') {
                    console.log('[WebRTC] Creating answer');
                    await peer.setLocalDescription();
                    if (peer.localDescription) {
                        sendSignal(MessageType.WEBRTC_ANSWER, { sdp: peer.localDescription }, userId, fromUserId);
                    }
                }
            } else if (signal.candidate) {
                try {
                    if (peer.remoteDescription) {
                        await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
                    } else {
                        console.log('[WebRTC] Queuing ICE candidate - no remote description yet');
                    }
                } catch (err) {
                    if (!pc.ignoreOffer) {
                        console.error('[WebRTC] Error adding ICE candidate:', err);
                    }
                }
            }
        } catch (err) {
            console.error('[WebRTC] Error handling signal:', err);
        }
    }, [getOrCreatePeer, isHost, sendSignal, userId, updatePeerTracks]);

    // Initiate connection to a peer
    const initiatePeer = useCallback((targetUserId: string) => {
        console.log(`[WebRTC] Initiating peer connection to ${targetUserId}`);
        const peer = getOrCreatePeer(targetUserId);

        // Add tracks if we have streams
        if (voiceStreamRef.current || screenStreamRef.current) {
            updatePeerTracks(peer);
        } else {
            // Create transceivers for receiving when we have no local streams
            console.log('[WebRTC] No local streams, adding transceivers for receiving');
            try {
                if (peer.getTransceivers().length === 0) {
                    peer.addTransceiver('audio', { direction: 'recvonly' });
                    peer.addTransceiver('video', { direction: 'recvonly' });
                }
            } catch (err) {
                console.error('[WebRTC] Error adding transceivers:', err);
            }
        }
    }, [getOrCreatePeer, updatePeerTracks]);

    // Remove a peer connection
    const removePeer = useCallback((targetUserId: string) => {
        const pc = peersRef.current.get(targetUserId);
        if (pc) {
            console.log(`[WebRTC] Removing peer ${targetUserId}`);
            pc.peer.close();
            peersRef.current.delete(targetUserId);
            setPeerCount(peersRef.current.size);

            if (peersRef.current.size === 0) {
                setRemoteStream(null);
                setRemoteVoiceStream(null);
            }
        }
    }, [setRemoteStream, setRemoteVoiceStream]);

    // Cleanup all connections
    const cleanup = useCallback(() => {
        console.log('[WebRTC] Cleaning up all peer connections');
        peersRef.current.forEach((pc) => {
            pc.peer.close();
        });
        peersRef.current.clear();
        setPeerCount(0);
        setConnectionState('new');
        setRemoteStream(null);
        setRemoteVoiceStream(null);
    }, [setConnectionState, setRemoteStream, setRemoteVoiceStream]);

    // Cleanup on unmount
    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    return {
        handleSignal,
        initiatePeer,
        removePeer,
        cleanup,
        connectionState,
        peerCount,
    };
};
