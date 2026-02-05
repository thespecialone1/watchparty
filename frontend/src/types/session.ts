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

export interface CreateSessionResponse {
    id: string;
    name: string;
    share_url: string;
    token: string;
    ice_servers?: RTCIceServer[];
}

export interface JoinSessionRequest {
    session_id: string;
    password: string;
}

export interface JoinSessionResponse {
    id: string;
    name: string;
    token: string;
    ice_servers?: RTCIceServer[];
}

export interface SessionInfoResponse {
    id: string;
    name: string;
    host_id: string;
    participants: string[];
    max_participants: number;
    created_at: string;
    expires_at: string;
}
