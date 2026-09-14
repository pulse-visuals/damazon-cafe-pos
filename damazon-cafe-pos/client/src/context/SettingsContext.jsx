import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);

  const reload = useCallback(() => {
    if (!user) return;
    api.get("/settings").then(setSettings).catch(() => {});
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const fmt = useCallback(
    (value) => {
      const symbol = settings?.currency_symbol || "RM";
      const num = Number(value || 0);
      return `${symbol} ${num.toFixed(2)}`;
    },
    [settings]
  );

  return (
    <SettingsContext.Provider value={{ settings, reload, fmt }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
