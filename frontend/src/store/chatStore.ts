import { create } from 'zustand';
import { ChatMessage } from '@/types/message';

interface ChatState {
    messages: ChatMessage[];
    unreadCount: number;

    addMessage: (message: ChatMessage) => void;
    clearMessages: () => void;
    resetUnreadCount: () => void;
    incrementUnreadCount: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    unreadCount: 0,

    addMessage: (message) =>
        set((state) => ({
            messages: [...state.messages, message],
        })),

    clearMessages: () => set({ messages: [], unreadCount: 0 }),

    resetUnreadCount: () => set({ unreadCount: 0 }),

    incrementUnreadCount: () =>
        set((state) => ({ unreadCount: state.unreadCount + 1 })),
}));
