"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { DEFAULT_SETTINGS, type PublicSettings } from "@/lib/site";

const SiteSettingsContext = createContext<PublicSettings>(DEFAULT_SETTINGS);

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    let alive = true;
    api
      .publicSettings()
      .then((data) => alive && setSettings(data))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return <SiteSettingsContext.Provider value={settings}>{children}</SiteSettingsContext.Provider>;
}
