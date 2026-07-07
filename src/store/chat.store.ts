import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { ChatMessage, Conversation } from '@/types';
import { nanoid } from 'nanoid';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  activeConversation: Conversation | null;
  createConversation: (title?: string, subjectId?: string) => string;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateLastMessage: (content: string) => void;
  setStreaming: (streaming: boolean) => void;
  setActiveConversation: (id: string | null) => void;
  deleteConversation: (id: string) => void;
  clearAll: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    immer((set, get) => ({
      conversations: [],
      activeConversationId: null,
      isStreaming: false,
      get activeConversation() {
        const state = get();
        return state.conversations.find(c => c.id === state.activeConversationId) ?? null;
      },
      createConversation: (title = 'New Chat', subjectId) => {
        const id = nanoid();
        set((state) => {
          state.conversations.unshift({
            id, userId: '', title, subjectId,
            messages: [], createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(), totalMessages: 0, provider: 'groq',
          });
          state.activeConversationId = id;
        });
        return id;
      },
      addMessage: (message) => set((state) => {
        const conv = state.conversations.find(c => c.id === state.activeConversationId);
        if (!conv) return;
        const newMsg: ChatMessage = { ...message, id: nanoid(), timestamp: new Date().toISOString() };
        conv.messages.push(newMsg);
        conv.totalMessages += 1;
        conv.updatedAt = new Date().toISOString();
        if (conv.messages.length === 1 && message.role === 'user') {
          conv.title = message.content.slice(0, 50);
        }
      }),
      updateLastMessage: (content) => set((state) => {
        const conv = state.conversations.find(c => c.id === state.activeConversationId);
        if (conv && conv.messages.length > 0) {
          const last = conv.messages[conv.messages.length - 1];
          if (last) last.content = content;
        }
      }),
      setStreaming: (streaming) => set((state) => { state.isStreaming = streaming; }),
      setActiveConversation: (id) => set((state) => { state.activeConversationId = id; }),
      deleteConversation: (id) => set((state) => {
        state.conversations = state.conversations.filter(c => c.id !== id);
        if (state.activeConversationId === id) state.activeConversationId = null;
      }),
      clearAll: () => set((state) => { state.conversations = []; state.activeConversationId = null; }),
    })),
    { name: 'ilm-ai-chat', partialize: (s) => ({ conversations: s.conversations.slice(0, 20), activeConversationId: s.activeConversationId }) }
  )
);
