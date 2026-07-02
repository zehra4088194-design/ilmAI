import { create } from 'zustand';
import { persist, immer } from 'zustand/middleware';
import type { UserProfile } from '@/types';

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isHydrated: boolean;
  setUser: (user: UserProfile | null) => void;
  updateUser: (updates: Partial<UserProfile>) => void;
  setLoading: (loading: boolean) => void;
  addXP: (amount: number) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    immer((set) => ({
      user: null,
      isLoading: true,
      isHydrated: false,
      setUser: (user) => set((state) => { state.user = user; state.isLoading = false; state.isHydrated = true; }),
      updateUser: (updates) => set((state) => { if (state.user) Object.assign(state.user, updates); }),
      setLoading: (loading) => set((state) => { state.isLoading = loading; }),
      addXP: (amount) => set((state) => {
        if (!state.user) return;
        state.user.xp += amount;
        state.user.level = Math.floor(state.user.xp / 1000) + 1;
      }),
      incrementStreak: () => set((state) => { if (state.user) state.user.streak += 1; }),
      resetStreak: () => set((state) => { if (state.user) state.user.streak = 0; }),
      logout: () => set((state) => { state.user = null; state.isHydrated = true; }),
    })),
    { name: 'studyverse-auth', partialize: (state) => ({ user: state.user }) }
  )
);
