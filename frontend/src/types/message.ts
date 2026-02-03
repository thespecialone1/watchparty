export enum MessageType {
    CHAT = 'chat',
    WEBRTC_OFFER = 'webrtc_offer',
    WEBRTC_ANSWER = 'webrtc_answer',
    ICE_CANDIDATE = 'ice_candidate',
    PLAYBACK_STATE = 'playback_state',
    USER_JOINED = 'user_joined',
    USER_LEFT = 'user_left',
}

export interface WebSocketMessage {
    type: MessageType;
    payload: unknown;
    session_id: string;
    user_id: string;
    target_id?: string;
    timestamp: number;
}

export interface ChatMessage {
    id: string;
    userId: string;
    username: string;
    message: string;
    timestamp: number;
}

export interface ChatPayload {
    id?: string;
    user_id: string;
    username: string;
    message: string;
    timestamp: number;
}

export interface UserEventPayload {
    user_id: string;
    username: string;
}

export interface PlaybackStatePayload {
    playing: boolean;
    current_time: number;
    volume: number;
}

export interface WebRTCSignalPayload {
    type?: 'offer' | 'answer';
    sdp?: string;
    candidate?: RTCIceCandidateInit;
}
