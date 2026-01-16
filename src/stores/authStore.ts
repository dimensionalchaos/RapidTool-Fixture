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

// Check if user has valid token on initialization
const hasValidToken = () => {
  const token = localStorage.getItem('accessToken');
  if (!token) return false;
  
  // Clear dummy tokens from old client-side auth fallback
  if (token.startsWith('dummy-token-')) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return false;
  }
  
  // For real JWT tokens, assume valid (will be validated by backend)
  return true;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: hasValidToken(),
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
      // Don't set isLoading to prevent infinite render loops
      const user = await authAPI.getCurrentUser();
      set({ 
        user, 
        isAuthenticated: true
      });
    } catch (error: any) {
      // Don't log user out if fetch fails - they may still have valid token
      // Silently fail to prevent blocking the app
      console.warn('[AuthStore] Failed to fetch current user:', error.message);
    }
  },
}));

window.addEventListener('auth:logout', () => {
  useAuthStore.getState().setUser(null);
  useAuthStore.getState().setError('Session expired. Please login again.');
});

