import { create } from 'zustand';
import { ConnectionState, QualityMetrics } from '@/types/webrtc';

interface ConnectionStore {
    // WebSocket state
    wsConnected: boolean;
    wsReconnecting: boolean;

    // WebRTC state
    connectionState: ConnectionState;
    metrics: QualityMetrics;

    // Screen share stream state
    localStream: MediaStream | null;      // Local screen share
    remoteStream: MediaStream | null;     // Remote screen share (video + audio)
    isScreenSharing: boolean;

    // Voice chat stream state
    voiceStream: MediaStream | null;      // Local voice (microphone)
    remoteVoiceStream: MediaStream | null; // Remote voice audio
    isAudioEnabled: boolean;

    // Actions
    setWsConnected: (connected: boolean) => void;
    setWsReconnecting: (reconnecting: boolean) => void;
    setConnectionState: (state: ConnectionState) => void;
    setMetrics: (metrics: QualityMetrics) => void;
    setLocalStream: (stream: MediaStream | null) => void;
    setRemoteStream: (stream: MediaStream | null) => void;
    setIsScreenSharing: (sharing: boolean) => void;
    setVoiceStream: (stream: MediaStream | null) => void;
    setRemoteVoiceStream: (stream: MediaStream | null) => void;
    setIsAudioEnabled: (enabled: boolean) => void;
    reset: () => void;
}

const initialMetrics: QualityMetrics = {
    bandwidth: 0,
    packetLoss: 0,
    jitter: 0,
    rtt: 0,
};

export const useConnectionStore = create<ConnectionStore>((set) => ({
    wsConnected: false,
    wsReconnecting: false,
    connectionState: 'new',
    metrics: initialMetrics,
    localStream: null,
    remoteStream: null,
    isScreenSharing: false,
    voiceStream: null,
    remoteVoiceStream: null,
    isAudioEnabled: true,

    setWsConnected: (wsConnected) => set({ wsConnected }),
    setWsReconnecting: (wsReconnecting) => set({ wsReconnecting }),
    setConnectionState: (connectionState) => set({ connectionState }),
    setMetrics: (metrics) => set({ metrics }),
    setLocalStream: (localStream) => set({ localStream }),
    setRemoteStream: (remoteStream) => set({ remoteStream }),
    setIsScreenSharing: (isScreenSharing) => set({ isScreenSharing }),
    setVoiceStream: (voiceStream) => set({ voiceStream }),
    setRemoteVoiceStream: (remoteVoiceStream) => set({ remoteVoiceStream }),
    setIsAudioEnabled: (isAudioEnabled) => set({ isAudioEnabled }),

    reset: () =>
        set({
            wsConnected: false,
            wsReconnecting: false,
            connectionState: 'new',
            metrics: initialMetrics,
            localStream: null,
            remoteStream: null,
            isScreenSharing: false,
            voiceStream: null,
            remoteVoiceStream: null,
            isAudioEnabled: true,
        }),
}));
