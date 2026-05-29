import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach stored token on startup
const stored = localStorage.getItem('faas-auth');
if (stored) {
  try {
    const { state } = JSON.parse(stored);
    if (state?.accessToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${state.accessToken}`;
    }
  } catch {
    // ignore
  }
}

// Response interceptor — handle 401 with token refresh
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      // Dynamically import to avoid circular deps
      const { useAuthStore } = await import('@/store/authStore');
      const refreshed = await useAuthStore.getState().refreshAccessToken();
      if (refreshed) {
        original.headers['Authorization'] = api.defaults.headers.common['Authorization'];
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);
