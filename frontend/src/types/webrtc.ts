export interface PeerConnection {
    id: string;
    peer: RTCPeerConnection;
    userId: string;
}

export type ConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed';

export interface QualityMetrics {
    bandwidth: number;
    packetLoss: number;
    jitter: number;
    rtt: number;
}

export interface QualityLevel {
    width: number;
    height: number;
    frameRate: number;
    bitrate: number;
}
