"use client";

import { useCallback, useEffect, useState } from "react";
import { toSpeakableText } from "@/lib/export";
import type { TeacherVoice } from "@/lib/teachers";

const FEMALE =
  /female|samantha|victoria|karen|moira|tessa|zira|susan|serena|fiona|ava|allison|kate|veena|lekha|google uk english female/i;
const MALE = /\bmale|daniel|alex|fred|david|mark|rishi|aaron|arthur|oliver|tom|google uk english male/i;

function pickVoice(voice: TeacherVoice) {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  const pattern = voice === "female" ? FEMALE : MALE;
  return voices.find((v) => pattern.test(v.name) && !(voice === "male" && FEMALE.test(v.name))) ?? voices[0];
}

export function useReadAloud() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const toggle = useCallback(
    (id: string, text: string, voice: TeacherVoice) => {
      if (!supported) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      if (speakingId === id) {
        setSpeakingId(null);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(toSpeakableText(text));
      const chosen = pickVoice(voice);
      if (chosen) utterance.voice = chosen;
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
