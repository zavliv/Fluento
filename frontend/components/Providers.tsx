"use client";

import type { ReactNode } from "react";
import { SiteSettingsProvider } from "./SiteSettings";
import { ToastProvider } from "./ui/Toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SiteSettingsProvider>
      <ToastProvider>{children}</ToastProvider>
    </SiteSettingsProvider>
  );
}
