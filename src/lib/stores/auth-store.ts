import { create } from 'zustand';

interface Child {
  id: string;
  nickname: string;
  grade?: string;
}

interface User {
  id: string;
  name?: string;
  email?: string;
}

interface AuthState {
  user: User | null;
  children: Child[];
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setChildren: (children: Child[]) => void;
  setLoading: (loading: boolean) => void;
}

// 创建 store
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  children: [],
  isLoading: true,
  setUser: (user) => set({ user }),
  setChildren: (children) => set({ children }),
  setLoading: (isLoading) => set({ isLoading }),
}));
