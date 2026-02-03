import axios from 'axios';
import {
    CreateSessionRequest,
    CreateSessionResponse,
    JoinSessionRequest,
    JoinSessionResponse,
    SessionInfoResponse,
} from '@/types/session';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('session_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('session_token');
            localStorage.removeItem('session_id');
        }
        return Promise.reject(error);
    }
);

export const api = {
    createSession: async (data: CreateSessionRequest): Promise<CreateSessionResponse> => {
        const response = await apiClient.post<CreateSessionResponse>('/sessions/create', data);
        return response.data;
    },

    joinSession: async (data: JoinSessionRequest): Promise<JoinSessionResponse> => {
        const response = await apiClient.post<JoinSessionResponse>('/sessions/join', data);
        return response.data;
    },

    getSession: async (sessionId: string): Promise<SessionInfoResponse> => {
        const response = await apiClient.get<SessionInfoResponse>(`/sessions/${sessionId}`);
        return response.data;
    },
};

export default api;
