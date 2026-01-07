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
  
  if (token.startsWith('dummy-token-')) {
    return true;
  }
  
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
      
      try {
        console.log('[AuthStore] Attempting backend authentication...');
        const response = await authAPI.login({ email, password });
        console.log('[AuthStore] Backend login successful:', response);
        set({ 
          user: response.user as User, 
          isAuthenticated: true, 
          isLoading: false 
        });
        console.log('[AuthStore] Auth state updated - isAuthenticated: true');
      } catch (backendError: any) {
        // --- MODIFIED SECTION START ---
        
        // Extract the error message from the backend response if it exists
        const serverErrorMessage = backendError.response?.data?.error || backendError.message;
        const statusCode = backendError.response?.status;

        // If the backend actually responded with 401 (Unauthorized) or 400, it's a credential issue
        if (statusCode === 401 || statusCode === 400 || statusCode === 403) {
          alert(`Login Failed: ${serverErrorMessage}`);
          throw new Error(serverErrorMessage); 
        }

        // If we get here, the backend is likely unreachable (Network Error)
        console.warn('[AuthStore] Backend unavailable, using client-side auth fallback');
        alert(`Backend unreachable (${serverErrorMessage}). Entering Development Guest Mode.`);
        
        if (email && password) {
          localStorage.setItem('accessToken', 'dummy-token-' + Date.now());
          set({ 
            user: { 
              id: 'local-user',
              email, 
              emailVerified: true 
            } as User, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } else {
          throw new Error('Email and password required');
        }
        // --- MODIFIED SECTION END ---
      }
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
      const user = await authAPI.getCurrentUser();
      set({ 
        user, 
        isAuthenticated: true
      });
    } catch (error: any) {
      console.warn('[AuthStore] Failed to fetch current user:', error.message);
    }
  },
}));

window.addEventListener('auth:logout', () => {
  useAuthStore.getState().setUser(null);
  useAuthStore.getState().setError('Session expired. Please login again.');
});