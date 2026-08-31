import { createContext, useCallback, useContext, useMemo, useState } from "react";

const API_BASE = "http://localhost:4000/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Token and user live only in component state — never persisted to
  // localStorage/sessionStorage, so a page reload requires logging in again.
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // best-effort — clear local state regardless of network failure
      }
    }
    setToken(null);
    setUser(null);
  }, [token]);

  const authFetch = useCallback(
    async (path, options = {}) => {
      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.status === 401) {
        setToken(null);
        setUser(null);
      }
      return res;
    },
    [token]
  );

  const value = useMemo(
    () => ({ token, user, isAuthenticated: Boolean(token), login, logout, authFetch }),
    [token, user, login, logout, authFetch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
