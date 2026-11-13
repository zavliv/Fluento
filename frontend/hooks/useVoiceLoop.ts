"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeAudio } from "@/lib/api";
import { extensionFor, microphoneError, pickMimeType, startLevelMeter } from "@/lib/audio";
import { createSpeechQueue, stopSpeech, type SpeechQueue } from "@/lib/speech";

export type VoicePhase = "idle" | "listening" | "transcribing" | "thinking" | "speaking";
export type VoiceHandler = (text: string, say: (delta: string) => void) => Promise<boolean>;

const SPEECH_MS = 280;
const SILENCE_MS = 900;
const IDLE_TIMEOUT_MS = 25_000;
const MAX_TURN_MS = 60_000;
const BARGE_LEVEL = 0.38;
const BARGE_MS = 380;

type Turn = {
  recorder: MediaRecorder;
  chunks: Blob[];
  stopMeter: () => void;
  heardMs: number;
  lastLoud: number;
  lastFrame: number;
  noise: number;
  finished: boolean;
  finish: () => void;
};

export function useVoiceLoop(onUtterance: VoiceHandler) {
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const turnRef = useRef<Turn | null>(null);
  const queueRef = useRef<SpeechQueue | null>(null);
  const bargeRef = useRef<(() => void) | null>(null);
  const sessionRef = useRef(0);
  const handlerRef = useRef(onUtterance);
  const listenRef = useRef<() => void>(() => {});

  useEffect(() => {
    handlerRef.current = onUtterance;
  }, [onUtterance]);

  const stopBarge = () => {
    bargeRef.current?.();
    bargeRef.current = null;
  };

  const endTurn = (turn: Turn) => {
    turn.stopMeter();
    turn.recorder.onstop = null;
    if (turn.recorder.state !== "inactive") turn.recorder.stop();
    if (turnRef.current === turn) turnRef.current = null;
    setLevel(0);
  };

  const release = useCallback(() => {
    sessionRef.current += 1;
    if (turnRef.current) endTurn(turnRef.current);
    stopBarge();
    queueRef.current = null;
    stopSpeech();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => release, [release]);

  const interrupt = useCallback(() => {
    stopBarge();
    queueRef.current = null;
    stopSpeech();
    sessionRef.current += 1;
    listenRef.current();
  }, []);

  const speakThen = useCallback(
    (session: number) => {
      const stream = streamRef.current;
      const queue = createSpeechQueue({
        onStart: () => {
          if (session !== sessionRef.current) return;
          setPhase("speaking");
          if (!stream) return;
          let loudMs = 0;
          let lastFrame = 0;
          bargeRef.current = startLevelMeter(stream, (value) => {
            const now = performance.now();
            const delta = lastFrame ? now - lastFrame : 0;
            lastFrame = now;
            loudMs = value > BARGE_LEVEL ? loudMs + delta : Math.max(0, loudMs - delta);
            if (loudMs >= BARGE_MS && session === sessionRef.current) interrupt();
          });
        },
        onEnd: () => {
          stopBarge();
          if (session === sessionRef.current) listenRef.current();
        },
      });
      queueRef.current = queue;
      return queue;
    },
    [interrupt],
  );

  const listen = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const session = sessionRef.current;
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const turn: Turn = {
      recorder,
      chunks: [],
      stopMeter: () => {},
      heardMs: 0,
      lastLoud: 0,
      lastFrame: 0,
      noise: 0.05,
      finished: false,
      finish: () => {},
    };
    turnRef.current = turn;
    recorder.ondataavailable = (e) => e.data.size > 0 && turn.chunks.push(e.data);

    turn.finish = () => {
      if (turn.finished) return;
      turn.finished = true;
      turn.stopMeter();
      setLevel(0);
      recorder.onstop = async () => {
        if (turnRef.current === turn) turnRef.current = null;
        if (session !== sessionRef.current) return;
        if (turn.heardMs < SPEECH_MS || !turn.chunks.length) return listenRef.current();
        setPhase("transcribing");
        let text = "";
        try {
          const blob = new Blob(turn.chunks, { type: recorder.mimeType });
          text = (await transcribeAudio(blob, `voice.${extensionFor(recorder.mimeType)}`)).trim();
        } catch (err) {
          if (session !== sessionRef.current) return;
          setError(err instanceof Error ? err.message : "Couldn't hear that.");
          return listenRef.current();
        }
        if (session !== sessionRef.current) return;
        if (!text) return listenRef.current();
        setError(null);
        setPhase("thinking");
        const queue = speakThen(session);
        const ok = await handlerRef.current(text, (delta) => {
          if (session === sessionRef.current) queue.push(delta);
        });
        if (session !== sessionRef.current) return;
        if (ok) queue.close();
        else {
          queue.stop();
          setPhase("idle");
        }
      };
      if (recorder.state !== "inactive") recorder.stop();
      else void recorder.onstop?.(new Event("stop"));
    };

    turn.stopMeter = startLevelMeter(stream, (value, elapsed) => {
      const now = performance.now();
      const delta = turn.lastFrame ? now - turn.lastFrame : 0;
      turn.lastFrame = now;
      const threshold = Math.max(0.12, turn.noise * 2.5);
      if (value > threshold) {
        turn.heardMs += delta;
        turn.lastLoud = now;
      } else if (turn.heardMs < SPEECH_MS) {
        turn.noise = turn.noise * 0.95 + value * 0.05;
      }
      setLevel(value);
      if (turn.heardMs >= SPEECH_MS && now - turn.lastLoud > SILENCE_MS) turn.finish();
      else if (elapsed > MAX_TURN_MS) turn.finish();
      else if (turn.heardMs < SPEECH_MS && elapsed > IDLE_TIMEOUT_MS) {
        endTurn(turn);
        setPhase("idle");
      }
    });
    recorder.start(250);
    setPhase("listening");
  }, [speakThen]);

  useEffect(() => {
    listenRef.current = listen;
  }, [listen]);

  const start = useCallback(
    async (greeting?: string) => {
      setError(null);
      if (!streamRef.current) {
        try {
          streamRef.current = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
        } catch (err) {
          setError(microphoneError(err));
          return;
        }
      }
      sessionRef.current += 1;
      if (greeting) {
        setPhase("thinking");
        const queue = speakThen(sessionRef.current);
        queue.push(greeting);
        queue.close();
      } else {
        listen();
      }
    },
    [listen, speakThen],
  );

  const doneTalking = useCallback(() => {
    const turn = turnRef.current;
    if (!turn) return;
    turn.heardMs = Math.max(turn.heardMs, SPEECH_MS);
    turn.finish();
  }, []);

  const end = useCallback(() => {
    release();
    setPhase("idle");
    setLevel(0);
  }, [release]);

  return { phase, level, error, start, doneTalking, interrupt, end };
}
