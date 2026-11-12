"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Teacher } from "@/lib/teachers";

export function useTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .teachers()
      .then((data) => alive && setTeachers(data))
      .catch((err: Error) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return { teachers, loading, error };
}
