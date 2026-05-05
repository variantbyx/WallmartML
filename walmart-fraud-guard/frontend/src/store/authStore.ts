import { create } from "zustand";
import { User } from "../types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : null,
  accessToken: localStorage.getItem("access_token"),

  login: (user: User, token: string) => {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("access_token", token);
    set({ user, accessToken: token });
  },

  logout: () => {
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    set({ user: null, accessToken: null });
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
