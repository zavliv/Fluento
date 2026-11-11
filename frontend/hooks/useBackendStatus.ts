"use client";

import { useEffect, useState } from "react";
import { checkHealth } from "@/lib/api";

export function useBackendStatus() {
  const [status, setStatus] = useState<{ online: boolean | null; model: string | null }>({
    online: null,
    model: null,
  });

  useEffect(() => {
    let alive = true;
    const check = async () => {
      const result = await checkHealth();
      if (alive) setStatus(result);
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

  return status;
}
