"use client";

import { Check, Keyboard, LoaderCircle, Mic, RotateCcw, Send, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import type { LevelTest } from "@/lib/api";
import { formatDuration } from "@/components/VoiceRecorderBar";
import { cn } from "@/lib/utils";
import { FocusBar, PrimaryButton, SecondaryButton, useSpeaker } from "./shared";

type Mode = "voice" | "type";

export function ChatRound({
  test,
  busy,
  error,
  onAnswer,
  onClose,
}: {
  test: LevelTest;
  busy: boolean;
  error: string | null;
  onAnswer: (text: string, voice: boolean) => Promise<boolean>;
  onClose: () => void;
}) {
  const question = [...test.messages].reverse().find((m) => m.role === "examiner")?.content ?? "";
  const number = Math.min(test.answered + 1, test.question_count);
  const { speak, playing, supported: canSpeak } = useSpeaker();
  const [mode, setMode] = useState<Mode>("voice");
  const [draft, setDraft] = useState("");
  const [voiced, setVoiced] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  const handlers = useMemo(
    () => ({
      onLive: (text: string) => setDraft(text),
      onFinal: (text: string) => {
        setDraft(text);
        if (text.trim()) setVoiced(true);
      },
      onCancel: () => setDraft(""),
    }),
    [],
  );
  const voice = useVoiceInput(handlers);
  const listening = voice.state === "listening";
  const transcribing = voice.state === "transcribing";
  const recorded = mode === "voice" && voice.state === "idle" && draft.trim().length > 0;

  useEffect(() => {
    if (!question || !canSpeak) return;
    const timer = window.setTimeout(() => speak(question), 250);
    return () => window.clearTimeout(timer);
  }, [question, canSpeak, speak]);

  useEffect(() => {
    if (mode === "type") area.current?.focus();
  }, [mode]);

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    if (await onAnswer(text, voiced)) {
      setDraft((current) => (current.trim() === text ? "" : current));
      setVoiced(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FocusBar
        onClose={onClose}
        progress={(test.answered / test.question_count) * 100}
        right={
          <span className="text-sm font-semibold text-muted tabular-nums">
            {number} of {test.question_count}
          </span>
        }
      />

      <div className="flex min-h-0 flex-1 overflow-y-auto">
        <div className="m-auto w-full max-w-xl px-5 py-8 text-center">
          {test.topic && (
            <span className="inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
              {test.topic}
            </span>
          )}

          <div className="mt-5 flex gap-3 rounded-3xl border border-line bg-surface p-5 text-left md:p-6">
            <button
              type="button"
              onClick={() => (canSpeak && question ? speak(question) : undefined)}
              disabled={!canSpeak || busy}
              aria-label="Read the question aloud"
              title="Read aloud"
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
                playing
                  ? "bg-accent text-accent-ink"
                  : "bg-accent-soft text-accent hover:bg-accent hover:text-accent-ink",
              )}
            >
              <Volume2 className="size-[18px]" />
            </button>
            {busy ? (
              <span className="flex items-center gap-1.5 py-2" aria-label="Writing the next question">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="size-2 animate-bounce rounded-full bg-subtle"
                    style={{ animationDelay: `${d * 120}ms` }}
                  />
                ))}
              </span>
            ) : (
              <p key={question} className="animate-in text-[19px] leading-[1.55] text-ink">
                {question}
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-danger/8 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="mt-8">
            {mode === "type" ? (
              <div className="text-left">
                <textarea
                  ref={area}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={3}
                  disabled={busy}
                  placeholder="Type your answer in your own words…"
                  className="block w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-[16px] leading-relaxed text-ink outline-none placeholder:text-subtle focus:border-accent/60"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setMode("voice")}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
                  >
                    <Mic className="size-4" />
                    Speak instead
                  </button>
                  <PrimaryButton onClick={() => void send()} disabled={!draft.trim() || busy}>
                    {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Send answer
                  </PrimaryButton>
                </div>
              </div>
            ) : recorded ? (
              <div className="text-left">
                <p className="mb-2 text-xs font-semibold text-muted">What we heard. Fix anything before sending.</p>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={3}
                  disabled={busy}
                  className="block w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-[16px] leading-relaxed text-ink outline-none focus:border-accent/60"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <SecondaryButton
                    onClick={() => {
                      setDraft("");
                      setVoiced(false);
                      void voice.start();
                    }}
                    disabled={busy}
                  >
                    <RotateCcw className="size-4" />
                    Record again
                  </SecondaryButton>
                  <PrimaryButton onClick={() => void send()} disabled={busy}>
                    {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Send answer
                  </PrimaryButton>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {listening && (
                  <p className="mb-5 min-h-[3.2em] max-w-md text-[17px] leading-relaxed text-ink">
                    {draft || <span className="text-subtle">Listening… start speaking</span>}
                  </p>
                )}
                {transcribing ? (
                  <span className="flex size-24 items-center justify-center rounded-full bg-hover text-muted">
                    <LoaderCircle className="size-9 animate-spin" />
                  </span>
                ) : listening ? (
                  <div className="flex items-center gap-5">
                    <button
                      type="button"
                      onClick={voice.cancel}
                      aria-label="Cancel recording"
                      className="flex size-12 items-center justify-center rounded-full border border-line bg-surface text-muted hover:text-ink"
                    >
                      <X className="size-5" />
                    </button>
                    <button
                      type="button"
                      onClick={voice.finish}
                      aria-label="Done speaking"
                      className="relative flex size-24 items-center justify-center rounded-full bg-danger text-white"
                    >
                      <span className="absolute inset-0 animate-ping rounded-full bg-danger opacity-20" />
                      <Check className="relative size-10" strokeWidth={2.5} />
                    </button>
                    <span className="w-12 text-left font-mono text-sm text-muted tabular-nums">
                      {formatDuration(voice.elapsed)}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      voice.clearError();
                      setVoiced(false);
                      void voice.start();
                    }}
                    disabled={busy}
                    aria-label="Tap and speak your answer"
                    className="flex size-24 items-center justify-center rounded-full bg-accent text-accent-ink transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    <Mic className="size-10" />
                  </button>
                )}
                <p className="mt-4 text-sm text-muted">
                  {transcribing
                    ? "Writing down what you said…"
                    : listening
                      ? "Tap the check when you're done"
                      : "Tap and speak"}
                  {!listening && !transcribing && (
                    <>
                      {" · "}
                      <button
                        type="button"
                        onClick={() => setMode("type")}
                        className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
                      >
                        <Keyboard className="size-3.5" />
                        or type instead
                      </button>
                    </>
                  )}
                </p>
                {voice.error && <p className="mt-2 text-sm text-danger">{voice.error}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
