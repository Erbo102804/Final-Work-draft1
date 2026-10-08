"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, clearTokens, getTokens, setTokens } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [choices, setChoices] = useState(null);

  const reload = useCallback(async () => {
    if (!getTokens().access) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const me = await api("/auth/me");
      setUser(me);
      return me;
    } catch {
      clearTokens();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    api("/meta/choices").then(setChoices).catch(() => setChoices(null));
  }, [reload]);

  const login = useCallback(async (email, password) => {
    const tokens = await api("/auth/login", { method: "POST", body: { email, password } });
    setTokens(tokens);
    return reload();
  }, [reload]);

  const register = useCallback(async (payload) => {
    const data = await api("/auth/register", { method: "POST", body: payload });
    setTokens(data);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, choices, login, register, logout, reload, setUser }),
    [user, loading, choices, login, register, logout, reload]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
