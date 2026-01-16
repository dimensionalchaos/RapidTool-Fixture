import { create } from 'zustand';
import { authAPI, User, RegisterResponse } from '@/services/api/auth';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true, // Start in loading state while checking cookies
  isAuthenticated: false,
  error: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    console.log('[AuthStore] Login attempt for:', email);
    try {
      set({ isLoading: true, error: null });

      // Backend authentication only
      console.log('[AuthStore] Attempting backend authentication...');
      const response = await authAPI.login({ email, password });
      console.log('[AuthStore] Backend login successful:', response);
      set({
        user: response.user as User,
        isAuthenticated: true,
        isLoading: false
      });
      console.log('[AuthStore] Auth state updated - isAuthenticated: true');
    } catch (error: any) {
      console.error('[AuthStore] Login failed:', error);
      set({
        error: error.message || 'Login failed',
        isLoading: false,
        isAuthenticated: false
      });
      throw error;
    }
  },

  register: async (email, password, name) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authAPI.register({ email, password, confirmPassword: password, name });
      set({ isLoading: false });
      return response;
    } catch (error: any) {
      set({
        error: error.message || 'Registration failed',
        isLoading: false
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true });
      await authAPI.logout();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      set({
        error: error.message || 'Logout failed',
        isLoading: false
      });
      throw error;
    }
  },

  fetchCurrentUser: async () => {
    try {
      // Don't set isLoading to true here, we assume it's already true if this is the initial check
      const user = await authAPI.getCurrentUser();
      set({
        user,
        isAuthenticated: true,
        isLoading: false
      });
      console.log('[AuthStore] Current user fetched successfully');
    } catch (error: any) {
      console.warn('[AuthStore] Failed to fetch current user:', error.message);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  },
}));

window.addEventListener('auth:logout', () => {
  useAuthStore.getState().setUser(null);
  useAuthStore.getState().setError('Session expired. Please login again.');
});

