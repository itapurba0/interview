import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: number;
  role: "candidate" | "hr" | "manager";
  company_id: number | null;
}

interface AuthState {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,

      login: (user) => {
        set({ user });
      },

      logout: () => {
        document.cookie = "hireops_session=; path=/; max-age=0;"; // clear auth cookie
        set({ user: null });
      },

      isAuthenticated: () => {
        return get().user !== null;
      },
    }),
    {
      name: "hireops-auth",
    }
  )
);
