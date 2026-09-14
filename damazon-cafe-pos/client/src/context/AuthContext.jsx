import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("damazon-token");
    if (!token) {
      setReady(true);
      return;
    }
    api
      .get("/auth/me")
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem("damazon-token");
      })
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (username, password) => {
    const { token, user: u } = await api.login(username, password);
    localStorage.setItem("damazon-token", token);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("damazon-token");
    setUser(null);
  }, []);

  const can = useCallback(
    (...roles) => !!user && roles.includes(user.role),
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, ready, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
