import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  full_name: string | null;
  subscription_tier: string;
  credits: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          // Cookies are automatically sent with withCredentials: true
          const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/me`, {
            withCredentials: true
          });
          set({ user: response.data, isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      logout: async () => {
        try {
          await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/logout`, {}, {
            withCredentials: true
          });
        } finally {
          set({ user: null, isAuthenticated: false });
          window.location.href = '/login';
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
