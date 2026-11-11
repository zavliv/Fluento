"use client";

import { useCallback, useEffect, useState } from "react";
import { toSpeakableText } from "@/lib/export";

export function useReadAloud() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const toggle = useCallback(
    (id: string, text: string) => {
      if (!supported) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      if (speakingId === id) {
        setSpeakingId(null);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(toSpeakableText(text));
      const done = () => setSpeakingId((current) => (current === id ? null : current));
      utterance.onend = done;
      utterance.onerror = done;
      setSpeakingId(id);
      synth.speak(utterance);
    },
    [speakingId, supported],
  );

  return { speakingId, toggle, supported };
}
