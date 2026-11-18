"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { apiClient, STORAGE_KEYS, type LoginPayload } from "./api";

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

const TOKEN_KEY = STORAGE_KEYS.TOKEN;
const USER_KEY = STORAGE_KEYS.USER;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate display user from localStorage and verify HttpOnly cookie session
  useEffect(() => {
    let active = true;
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }

    // Remove any legacy tokens previously persisted in localStorage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);

    fetch("/api/v1/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!active) return;
        const me = body?.data?.user ?? body?.user;
        if (me?.sub) {
          const authUser: AuthUser = {
            sub: me.sub,
            email: me.email,
            role: me.role,
          };
          setUser(authUser);
          localStorage.setItem(USER_KEY, JSON.stringify(authUser));
        } else {
          setUser(null);
          localStorage.removeItem(USER_KEY);
        }
      })
      .catch(() => {
        // Keep cached user on transient network error
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await apiClient.login(payload);

    // Backend sets HttpOnly cookies (elis_token, elis_refresh_token) on login.
    // We only cache non-sensitive user display metadata in localStorage.
    const { user: userData } = response as unknown as {
      accessToken?: string;
      user: AuthUser;
    };

    if (!userData) {
      throw new Error("Login failed: unexpected response format");
    }

    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);

    setToken(null);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    // Invalidate JWT on the server and clear HttpOnly cookies
    fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch(() => {
      // Best-effort server revocation
    });

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);

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
