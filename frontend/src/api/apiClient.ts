import { API_BASE } from '../config';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

let _token: string | null = localStorage.getItem('auth_token');

function authHeaders(): HeadersInit {
  return _token ? { Authorization: `Bearer ${_token}` } : {};
}

async function request<T>(method: string, path: string, body?: unknown): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok) return { error: json.message ?? 'Erreur serveur' };
    return { data: json };
  } catch {
    return { error: 'Impossible de contacter le serveur.' };
  }
}

export const apiClient = {
  setToken(token: string) {
    _token = token;
    localStorage.setItem('auth_token', token);
  },

  clearToken() {
    _token = null;
    localStorage.removeItem('auth_token');
  },

  isAuthenticated(): boolean { return _token !== null; },

  async register(username: string, password: string) {
    return request<{ token: string; userId: string }>('POST', '/auth/register', { username, password });
  },

  async login(username: string, password: string) {
    return request<{ token: string; userId: string }>('POST', '/auth/login', { username, password });
  },

  async saveProgress(progress: unknown) {
    return request('PUT', '/progress', { progress });
  },

  async loadProgress() {
    return request<{ progress: unknown }>('GET', '/progress');
  },

  async saveRun(runData: {
    zonesCleared: number;
    roomsCleared: number;
    victory: boolean;
    goldEarned: number;
    heroesUsed: string[];
  }) {
    return request('POST', '/runs', runData);
  },

  async getLeaderboard() {
    return request<{ entries: unknown[] }>('GET', '/leaderboard');
  },
};
