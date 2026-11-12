"use client";

import { useCallback, useEffect, useState } from "react";

type LoadState<T> = { data: T | null; loading: boolean; error: string | null };

export function useLoad<T>(loader: () => Promise<T>) {
  const [state, setState] = useState<LoadState<T>>({ data: null, loading: true, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    loader()
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((err: Error) => alive && setState((s) => ({ ...s, loading: false, error: err.message })));
    return () => {
      alive = false;
    };
  }, [loader, version]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    setVersion((v) => v + 1);
  }, []);

  const setData = useCallback((update: (data: T | null) => T | null) => {
    setState((s) => ({ ...s, data: update(s.data) }));
  }, []);

  return { ...state, reload, setData };
}
