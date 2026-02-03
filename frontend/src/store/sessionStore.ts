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

    // Participants
    participants: Map<string, Participant>;

    // Connection state
    isConnected: boolean;

    // Actions
    setSession: (sessionId: string, sessionName: string, token: string, isHost: boolean) => void;
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
        return { sessionId: null, token: null, sessionName: null, isHost: false };
    }

    const token = localStorage.getItem('session_token');
    const sessionId = localStorage.getItem('session_id');
    const sessionName = localStorage.getItem('session_name');
    const isHost = localStorage.getItem('session_is_host') === 'true';

    return { sessionId, token, sessionName, isHost };
};

const initial = getInitialState();

export const useSessionStore = create<SessionState>((set) => ({
    sessionId: initial.sessionId,
    sessionName: initial.sessionName,
    token: initial.token,
    isHost: initial.isHost,
    participants: new Map(),
    isConnected: false,

    setSession: (sessionId, sessionName, token, isHost) => {
        // Store in localStorage for persistence
        localStorage.setItem('session_token', token);
        localStorage.setItem('session_id', sessionId);
        localStorage.setItem('session_name', sessionName);
        localStorage.setItem('session_is_host', String(isHost));

        set({
            sessionId,
            sessionName,
            token,
            isHost,
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

        set({
            sessionId: null,
            sessionName: null,
            token: null,
            isHost: false,
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
        });
    },
}));
