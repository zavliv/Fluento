"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type AdminAccount } from "@/lib/api";

type AdminAuthValue = {
  admin: AdminAccount | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AdminAccount>;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function useAdminAuth() {
  const value = useContext(AdminAuthContext);
  if (!value) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return value;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.admin
      .me()
      .then((data) => alive && setAdmin(data.admin))
      .catch(() => alive && setAdmin(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const next = await api.admin.login({ email, password });
    setAdmin(next);
    return next;
  }, []);

  const logout = useCallback(async () => {
    await api.admin.logout().catch(() => {});
    setAdmin(null);
  }, []);

  return <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>{children}</AdminAuthContext.Provider>;
}
