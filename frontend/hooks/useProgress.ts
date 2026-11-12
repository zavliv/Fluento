"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Progress } from "@/lib/api";

export function useProgress(signedIn: boolean) {
  const [progress, setProgress] = useState<Progress | null>(null);

  const refresh = useCallback(() => {
    if (!signedIn) return;
    api
      .progress()
      .then(setProgress)
      .catch(() => {});
  }, [signedIn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { progress, refresh };
}
