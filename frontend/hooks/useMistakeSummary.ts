"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type MistakeSummary } from "@/lib/api";

const AFTER_REPLY_MS = 4000;

export function useMistakeSummary(signedIn: boolean, isStreaming: boolean) {
  const [summary, setSummary] = useState<MistakeSummary | null>(null);
  const wasStreaming = useRef(false);

  const refresh = useCallback(() => {
    if (!signedIn) return;
    api
      .mistakeSummary()
      .then(setSummary)
      .catch(() => {});
  }, [signedIn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (wasStreaming.current && !isStreaming) {
      const timer = window.setTimeout(refresh, AFTER_REPLY_MS);
      wasStreaming.current = false;
      return () => window.clearTimeout(timer);
    }
    wasStreaming.current = isStreaming;
  }, [isStreaming, refresh]);

  return { summary, refresh };
}
