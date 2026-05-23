import { create } from "zustand";
import { User } from "../types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (user: User, token: string, refreshToken?: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : null,
  accessToken: localStorage.getItem("access_token"),
  refreshToken: localStorage.getItem("refresh_token"),

  login: (user: User, token: string, refreshToken?: string) => {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("access_token", token);
    if (refreshToken) {
      localStorage.setItem("refresh_token", refreshToken);
    }
    set({ user, accessToken: token, refreshToken: refreshToken ?? null });
  },

  logout: () => {
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, accessToken: null, refreshToken: null });
  },

  isAuthenticated: () => {
    const { user, accessToken } = get();
    return !!user && !!accessToken;
  },

  hasRole: (role: string) => {
    const { user } = get();
    return user ? user.role === role || user.role === "admin" : false;
  },
}));
