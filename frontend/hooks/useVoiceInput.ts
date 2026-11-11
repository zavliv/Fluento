"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeAudio } from "@/lib/api";
import { extensionFor, joinText, LEVEL_BARS, microphoneError, pickMimeType, startLevelMeter } from "@/lib/audio";
import {
  createSpeechRecognition,
  IGNORED_RECOGNITION_ERRORS,
  readTranscript,
  type SpeechRecognitionLike,
} from "@/lib/speechRecognition";

export type VoiceState = "idle" | "listening" | "transcribing";
export type VoiceMode = "live" | "record";

type Handlers = {
  onLive: (text: string) => void;
  onFinal: (text: string) => void;
  onCancel: () => void;
};

type Session = {
  stream: MediaStream;
  recorder: MediaRecorder;
  chunks: Blob[];
  stopMeter: () => void;
  recognition: SpeechRecognitionLike | null;
  live: boolean;
  committed: string;
  current: string;
  currentFinal: string;
  finishing: boolean;
  done: boolean;
  released: boolean;
};

const MAX_DURATION_MS = 2 * 60 * 1000;
const LIVE_FINISH_TIMEOUT_MS = 1500;
const silentLevels = () => Array<number>(LEVEL_BARS).fill(0);

export function useVoiceInput(handlers: Handlers) {
  const [state, setState] = useState<VoiceState>("idle");
  const [mode, setMode] = useState<VoiceMode>("live");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(silentLevels);

  const handlersRef = useRef(handlers);
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const release = useCallback((s: Session) => {
    if (s.released) return;
    s.released = true;
    s.stopMeter();
    s.stream.getTracks().forEach((track) => track.stop());
    if (sessionRef.current === s) sessionRef.current = null;
    setLevels(silentLevels());
  }, []);

  const finishWithWhisper = useCallback(
    (s: Session) => {
      if (s.done) return;
      s.done = true;
      s.recognition?.abort();

      s.recorder.onstop = async () => {
        release(s);
        if (s.chunks.length === 0) {
          handlersRef.current.onCancel();
          setState("idle");
          return;
        }
        setState("transcribing");
        try {
          const blob = new Blob(s.chunks, { type: s.recorder.mimeType });
          const text = await transcribeAudio(blob, `recording.${extensionFor(s.recorder.mimeType)}`);
          if (text) handlersRef.current.onFinal(text);
          else {
            handlersRef.current.onCancel();
            setError("Didn't catch that. Try speaking again.");
          }
        } catch (err) {
          handlersRef.current.onCancel();
          setError(err instanceof TypeError ? "Can't reach the backend." : (err as Error).message);
        } finally {
          setState("idle");
        }
      };

      if (s.recorder.state !== "inactive") s.recorder.stop();
      else void s.recorder.onstop?.(new Event("stop"));
    },
    [release],
  );

  const finishLive = useCallback(
    (s: Session) => {
      if (s.done) return;
      const text = joinText(s.committed, s.current);
      if (!text) {
        finishWithWhisper(s);
        return;
      }
      s.done = true;
      s.recorder.onstop = null;
      if (s.recorder.state !== "inactive") s.recorder.stop();
      release(s);
      handlersRef.current.onFinal(text);
      setState("idle");
    },
    [finishWithWhisper, release],
  );

  const fallBackToWhisper = useCallback(
    (s: Session) => {
      if (!s.live) return;
      s.live = false;
      s.recognition?.abort();
      setMode("record");
      handlersRef.current.onLive("");
      if (s.finishing) finishWithWhisper(s);
    },
    [finishWithWhisper],
  );

  const finish = useCallback(() => {
    const s = sessionRef.current;
    if (!s || s.finishing) return;
    s.finishing = true;
    if (s.live && s.recognition) {
      s.recognition.stop();
      setTimeout(() => finishLive(s), LIVE_FINISH_TIMEOUT_MS);
    } else {
      finishWithWhisper(s);
    }
  }, [finishLive, finishWithWhisper]);

  const cancel = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    s.done = true;
    s.recognition?.abort();
    s.recorder.onstop = null;
    if (s.recorder.state !== "inactive") s.recorder.stop();
    release(s);
    handlersRef.current.onCancel();
    setState("idle");
  }, [release]);

  const startRecognition = useCallback(
    (s: Session) => {
      const recognition = createSpeechRecognition();
      if (!recognition) return;

      recognition.onresult = (event) => {
        const { finalText, fullText } = readTranscript(event);
        s.current = fullText;
        s.currentFinal = finalText;
        handlersRef.current.onLive(joinText(s.committed, s.current));
      };

      recognition.onerror = (event) => {
        if (!IGNORED_RECOGNITION_ERRORS.includes(event.error)) fallBackToWhisper(s);
      };

      recognition.onend = () => {
        if (!s.live || s.done) return;
        if (s.finishing) {
          finishLive(s);
          return;
        }
        s.committed = joinText(s.committed, s.currentFinal);
        s.current = "";
        s.currentFinal = "";
        try {
          recognition.start();
        } catch {
          fallBackToWhisper(s);
        }
      };

      try {
        recognition.start();
        s.recognition = recognition;
        s.live = true;
      } catch {
        s.live = false;
      }
    },
    [fallBackToWhisper, finishLive],
  );

  const start = useCallback(async () => {
    if (sessionRef.current) return;
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice input isn't supported in this browser.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError(microphoneError(err));
      return;
    }

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

    const s: Session = {
      stream,
      recorder,
      chunks: [],
      stopMeter: () => {},
      recognition: null,
      live: false,
      committed: "",
      current: "",
      currentFinal: "",
      finishing: false,
      done: false,
      released: false,
    };

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) s.chunks.push(e.data);
    };

    s.stopMeter = startLevelMeter(stream, (level, elapsedMs) => {
      setLevels((prev) => [...prev.slice(1), level]);
      setElapsed(elapsedMs);
      if (elapsedMs >= MAX_DURATION_MS) finish();
    });

    sessionRef.current = s;
    recorder.start();
    startRecognition(s);

    setMode(s.live ? "live" : "record");
    setElapsed(0);
    setState("listening");
  }, [finish, startRecognition]);

  useEffect(
    () => () => {
      const s = sessionRef.current;
      if (!s) return;
      s.done = true;
      s.recognition?.abort();
      s.recorder.onstop = null;
      if (s.recorder.state !== "inactive") s.recorder.stop();
      release(s);
    },
    [release],
  );

  const clearError = useCallback(() => setError(null), []);

  return { state, mode, error, elapsed, levels, start, finish, cancel, clearError };
}
