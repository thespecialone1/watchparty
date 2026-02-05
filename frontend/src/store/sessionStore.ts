import { create } from 'zustand';

interface Participant {
    id: string;
    username: string;
}

interface SessionState {
    // Session data
    sessionId: string | null;
    sessionName: string | null;
    token: string | null;
    isHost: boolean;
    iceServers: string[];

    // Participants
    participants: Map<string, Participant>;

    // Connection state
    isConnected: boolean;

    // Actions
    setSession: (sessionId: string, sessionName: string, token: string, isHost: boolean, iceServers?: string[]) => void;
    setToken: (token: string) => void;
    setIsHost: (isHost: boolean) => void;
    setConnected: (connected: boolean) => void;
    addParticipant: (id: string, username: string) => void;
    removeParticipant: (id: string) => void;
    clearSession: () => void;
    initFromStorage: () => void;
}

// Helper to get initial state from localStorage
const getInitialState = () => {
    if (typeof window === 'undefined') {
        return { sessionId: null, token: null, sessionName: null, isHost: false, iceServers: [] };
    }

    const token = localStorage.getItem('session_token');
    const sessionId = localStorage.getItem('session_id');
    const sessionName = localStorage.getItem('session_name');
    const isHost = localStorage.getItem('session_is_host') === 'true';
    const iceServersStr = localStorage.getItem('session_ice_servers');
    const iceServers = iceServersStr ? JSON.parse(iceServersStr) : [];

    return { sessionId, token, sessionName, isHost, iceServers };
};

const initial = getInitialState();

export const useSessionStore = create<SessionState>((set) => ({
    sessionId: initial.sessionId,
    sessionName: initial.sessionName,
    token: initial.token,
    isHost: initial.isHost,
    iceServers: initial.iceServers,
    participants: new Map(),
    isConnected: false,

    setSession: (sessionId, sessionName, token, isHost, iceServers = []) => {
        // Store in localStorage for persistence
        localStorage.setItem('session_token', token);
        localStorage.setItem('session_id', sessionId);
        localStorage.setItem('session_name', sessionName);
        localStorage.setItem('session_is_host', String(isHost));
        localStorage.setItem('session_ice_servers', JSON.stringify(iceServers));

        set({
            sessionId,
            sessionName,
            token,
            isHost,
            iceServers,
        });
    },

    setToken: (token) => {
        localStorage.setItem('session_token', token);
        set({ token });
    },

    setIsHost: (isHost) => {
        localStorage.setItem('session_is_host', String(isHost));
        set({ isHost });
    },

    setConnected: (isConnected) => set({ isConnected }),

    addParticipant: (id, username) =>
        set((state) => {
            const participants = new Map(state.participants);
            participants.set(id, { id, username });
            return { participants };
        }),

    removeParticipant: (id) =>
        set((state) => {
            const participants = new Map(state.participants);
            participants.delete(id);
            return { participants };
        }),

    clearSession: () => {
        localStorage.removeItem('session_token');
        localStorage.removeItem('session_id');
        localStorage.removeItem('session_name');
        localStorage.removeItem('session_is_host');
        localStorage.removeItem('session_ice_servers');

        set({
            sessionId: null,
            sessionName: null,
            token: null,
            isHost: false,
            iceServers: [],
            participants: new Map(),
            isConnected: false,
        });
    },

    initFromStorage: () => {
        const state = getInitialState();
        set({
            sessionId: state.sessionId,
            sessionName: state.sessionName,
            token: state.token,
            isHost: state.isHost,
            iceServers: state.iceServers,
        });
    },
}));
