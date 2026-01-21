import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '10000');

export interface ApiError {
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
}

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api`,
      timeout: API_TIMEOUT,
      withCredentials: true, // Enable cookies for localtest.me domain
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // We now rely on HttpOnly cookies for authentication
        // No need to manually attach the Authorization header from localStorage
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newAccessToken = await this.refreshAccessToken();
            if (newAccessToken && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            this.clearTokens();
            window.dispatchEvent(new CustomEvent('auth:logout'));
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        // Rely on HttpOnly cookie for refresh token
        const response = await axios.post(`${API_URL}/api/auth/refresh`, {}, {
          withCredentials: true
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data || response.data;
        this.setTokens(accessToken, newRefreshToken);
        return accessToken;
      } catch (error) {
        this.clearTokens();
        window.dispatchEvent(new CustomEvent('auth:logout'));
        throw error;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private handleError(error: AxiosError): ApiError {
    if (error.response) {
      const data = error.response.data as any;
      return {
        message: data.message || 'An error occurred',
        statusCode: error.response.status,
        errors: data.errors,
      };
    } else if (error.request) {
      return {
        message: 'No response from server. Please check your connection.',
      };
    } else {
      return {
        message: error.message || 'An unexpected error occurred',
      };
    }
  }

  public getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  public getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  public setTokens(accessToken: string, refreshToken?: string | null): void {
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    }
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  public clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  public get instance(): AxiosInstance {
    return this.client;
  }
}

const apiClientInstance = new ApiClient();

export const apiClient = {
  instance: apiClientInstance.instance,
  getAccessToken: () => apiClientInstance.getAccessToken(),
  getRefreshToken: () => apiClientInstance.getRefreshToken(),
  setTokens: (accessToken: string, refreshToken?: string | null) => apiClientInstance.setTokens(accessToken, refreshToken),
  clearTokens: () => apiClientInstance.clearTokens(),
};

export default apiClient.instance;
