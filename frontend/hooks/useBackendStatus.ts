"use client";

import { useEffect, useState } from "react";
import { checkHealth } from "@/lib/api";

export function useBackendStatus() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      const ok = await checkHealth();
      if (alive) setOnline(ok);
    };
    void check();
    const timer = setInterval(check, 15000);
    window.addEventListener("focus", check);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, []);

  return online;
}
