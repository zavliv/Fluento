"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Teacher } from "@/lib/teachers";

const REFRESH_MS = 20000;

export function useTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .teachers()
        .then((data) => alive && setTeachers(data))
        .catch((err: Error) => alive && setError(err.message))
        .finally(() => alive && setLoading(false));
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [version]);

  return { teachers, loading, error, reload };
}
