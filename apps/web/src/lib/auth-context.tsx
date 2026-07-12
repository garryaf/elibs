"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { apiClient, type LoginPayload } from "./api";

export interface AuthUser {
  email: string;
  sub: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "elis_token";
const USER_KEY = "elis_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Ensure cookies are set for middleware
        document.cookie = `elis_authenticated=true; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
        document.cookie = `elis_token=${storedToken}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
      } catch {
        // Corrupted data — clear it
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        document.cookie = "elis_authenticated=; path=/; max-age=0";
        document.cookie = "elis_token=; path=/; max-age=0";
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await apiClient.login(payload);

    // After unwrapResponse(), the envelope is stripped — response contains the inner data directly.
    // Cast needed because LoginResponse type still reflects the raw API shape.
    const { accessToken, refreshToken, user: userData } = response as unknown as {
      accessToken: string;
      refreshToken?: string;
      user: AuthUser;
    };

    if (!accessToken || !userData) {
      throw new Error("Login failed: unexpected response format");
    }

    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    if (refreshToken) {
      localStorage.setItem("elis_refresh_token", refreshToken);
    }

    // Set cookies for middleware route protection (httpOnly not possible from client)
    document.cookie = `elis_authenticated=true; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
    document.cookie = `elis_token=${accessToken}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;

    setToken(accessToken);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("elis_refresh_token");

    // Clear auth cookies
    document.cookie = "elis_authenticated=; path=/; max-age=0";
    document.cookie = "elis_token=; path=/; max-age=0";

    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
