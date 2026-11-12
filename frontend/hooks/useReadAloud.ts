"use client";

import { useCallback, useEffect, useState } from "react";
import { toSpeakableText } from "@/lib/export";
import { speak, stopSpeech } from "@/lib/speech";
import type { TeacherVoice } from "@/lib/teachers";

export function useReadAloud() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const supported = typeof window !== "undefined";

  useEffect(() => () => stopSpeech(), []);

  const toggle = useCallback(
    (id: string, text: string, voice: TeacherVoice) => {
      if (speakingId === id) {
        stopSpeech();
        setSpeakingId(null);
        return;
      }
      setSpeakingId(id);
      void speak(toSpeakableText(text), {
        gender: voice,
        onEnd: () => setSpeakingId((current) => (current === id ? null : current)),
      });
    },
    [speakingId],
  );

  return { speakingId, toggle, supported };
}
