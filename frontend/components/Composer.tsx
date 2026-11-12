"use client";

import { ArrowUp, Check, LoaderCircle, Mic, Square, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { joinText } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { formatDuration, VoiceRecorderBar } from "./VoiceRecorderBar";

type Props = {
  onSend: (text: string, meta: { voice: boolean }) => void;
  onStop: () => void;
  isStreaming: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  hint?: string;
  stoppable?: boolean;
};

const MAX_HEIGHT = 220;

export function Composer({
  onSend,
  onStop,
  isStreaming,
  autoFocus,
  placeholder = "Type your message…",
  hint = "Your teacher corrects your English as you go. AI can make mistakes.",
  stoppable = true,
}: Props) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const textBeforeVoice = useRef("");
  const usedVoice = useRef(false);
  const canSend = value.trim().length > 0 && !isStreaming;

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
    el.scrollTop = el.scrollHeight;
  }, []);

  const writeVoiceText = useCallback(
    (text: string, focus = false) => {
      setValue(joinText(textBeforeVoice.current, text));
      requestAnimationFrame(() => {
        resize();
        const el = ref.current;
        if (focus && el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      });
    },
    [resize],
  );

  const voiceHandlers = useMemo(
    () => ({
      onLive: (text: string) => writeVoiceText(text),
      onFinal: (text: string) => {
        if (text.trim()) usedVoice.current = true;
        writeVoiceText(text, true);
      },
      onCancel: () => writeVoiceText("", true),
    }),
    [writeVoiceText],
  );

  const voice = useVoiceInput(voiceHandlers);
  const listening = voice.state === "listening";
  const liveListening = listening && voice.mode === "live";
  const showRecorderBar = voice.state === "transcribing" || (listening && voice.mode === "record");
  const voiceActive = voice.state !== "idle";

  const startVoice = () => {
    textBeforeVoice.current = value;
    voice.clearError();
    void voice.start();
  };

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (voice.state === "listening") {
        if (e.key === "Escape") {
          e.preventDefault();
          voice.cancel();
        } else if (e.key === "Enter") {
          e.preventDefault();
          voice.finish();
        }
        return;
      }
      const target = e.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, [contenteditable='true']");
      if (e.key === "/" && !typing) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [voice]);

  const submit = () => {
    if (!canSend || voiceActive) return;
    onSend(value, { voice: usedVoice.current });
    usedVoice.current = false;
    setValue("");
    requestAnimationFrame(() => {
      if (ref.current) ref.current.style.height = "auto";
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (voiceActive) return;
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div>
      <div
        className={cn(
          "composer rounded-[22px] border bg-surface transition-[border-color,box-shadow]",
          listening ? "border-danger/40" : "border-line focus-within:border-accent/45",
        )}
        onClick={() => !voiceActive && ref.current?.focus()}
      >
        {showRecorderBar && (
          <VoiceRecorderBar
            transcribing={voice.state === "transcribing"}
            elapsed={voice.elapsed}
            levels={voice.levels}
            onCancel={voice.cancel}
            onFinish={voice.finish}
          />
        )}

        <div className={cn(showRecorderBar && "hidden")}>
          <textarea
            ref={ref}
            rows={1}
            value={value}
            readOnly={liveListening}
            placeholder={liveListening ? "Listening… start speaking" : placeholder}
            onChange={(e) => {
              setValue(e.target.value);
              resize();
            }}
            onKeyDown={onKeyDown}
            aria-label="Message"
            className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] leading-6 text-ink outline-none placeholder:text-subtle"
            style={{ maxHeight: MAX_HEIGHT }}
          />

          <div className="flex items-center justify-between gap-2 px-2.5 pt-1 pb-2.5">
            {liveListening ? (
              <LiveIndicator elapsed={voice.elapsed} levels={voice.levels} />
            ) : (
              <>
                <span className="hidden items-center gap-3 pl-1.5 text-xs text-subtle sm:flex">
                  <span>
                    <kbd className="kbd">Enter</kbd> to send
                  </span>
                  <span>
                    <kbd className="kbd">Shift</kbd> + <kbd className="kbd">Enter</kbd> new line
                  </span>
                </span>
                <span className="sm:hidden" />
              </>
            )}

            <div className="flex items-center gap-1.5">
              {liveListening ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      voice.cancel();
                    }}
                    aria-label="Cancel voice input"
                    title="Cancel (Esc)"
                    className="flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-hover hover:text-ink"
                  >
                    <X className="size-[18px]" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      voice.finish();
                    }}
                    aria-label="Done speaking"
                    title="Done (Enter)"
                    className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-ink transition-transform hover:scale-105 active:scale-95"
                  >
                    <Check className="size-[18px]" strokeWidth={2.4} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startVoice();
                    }}
                    aria-label="Speak your message"
                    title="Speak your message"
                    className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent transition-all hover:scale-105 active:scale-95"
                  >
                    <Mic className="size-[18px]" />
                  </button>

                  {isStreaming && !stoppable ? (
                    <span
                      aria-label="Waiting for the next question"
                      className="flex size-9 items-center justify-center rounded-full bg-hover text-subtle"
                    >
                      <LoaderCircle className="size-[18px] animate-spin" />
                    </span>
                  ) : isStreaming ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStop();
                      }}
                      aria-label="Stop generating"
                      title="Stop generating (Esc)"
                      className="flex size-9 items-center justify-center rounded-full bg-ink text-bg transition-transform hover:scale-105 active:scale-95"
                    >
                      <Square className="size-3.5 fill-current" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        submit();
                      }}
                      disabled={!canSend}
                      aria-label="Send message"
                      title="Send message"
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full transition-all",
                        canSend
                          ? "bg-accent text-accent-ink hover:scale-105 active:scale-95"
                          : "cursor-not-allowed bg-hover text-subtle",
                      )}
                    >
                      <ArrowUp className="size-[18px]" strokeWidth={2.4} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <StatusLine error={voice.error} state={voice.state} live={liveListening} hint={hint} />
    </div>
  );
}

function LiveIndicator({ elapsed, levels }: { elapsed: number; levels: number[] }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 pl-1.5" role="status" aria-live="polite">
      <span className="relative flex size-2.5 shrink-0">
        <span className="absolute inset-0 animate-ping rounded-full bg-danger opacity-50" />
        <span className="relative size-2.5 rounded-full bg-danger" />
      </span>
      <span className="font-mono text-xs text-ink tabular-nums">{formatDuration(elapsed)}</span>
      <span className="flex h-5 items-center gap-[2px]" aria-hidden>
        {levels.slice(-16).map((level, i) => (
          <span
            key={i}
            className="w-[2px] rounded-full bg-accent transition-[height] duration-75"
            style={{ height: `${Math.max(15, level * 100)}%`, opacity: 0.35 + level * 0.65 }}
          />
        ))}
      </span>
    </div>
  );
}

function StatusLine({
  error,
  state,
  live,
  hint,
}: {
  error: string | null;
  state: string;
  live: boolean;
  hint: string;
}) {
  if (error) {
    return (
      <p className="mt-2 text-center text-xs text-danger" role="alert">
        {error}
      </p>
    );
  }
  const message =
    state === "listening"
      ? live
        ? "Words appear as you speak. Press Enter when done, or Esc to cancel."
        : "Recording… press Enter to finish, or Esc to cancel."
      : hint;
  return <p className="mt-2 text-center text-xs text-subtle">{message}</p>;
}
