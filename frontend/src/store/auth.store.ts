import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  tenantId: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  setAuth: (user, token) => {
    localStorage.setItem('gfas_token', token);
    localStorage.setItem('gfas_user', JSON.stringify(user));
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('gfas_token');
    localStorage.removeItem('gfas_user');
    set({ user: null, token: null });
  },
  initAuth: () => {
    const token = localStorage.getItem('gfas_token');
    const userStr = localStorage.getItem('gfas_user');
    if (token && userStr) {
      set({ token, user: JSON.parse(userStr) });
    }
  },
}));
