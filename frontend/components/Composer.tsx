"use client";

import { ArrowUp, Square } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

type Props = {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  autoFocus?: boolean;
  placeholder?: string;
};

const MAX_HEIGHT = 220;

export function Composer({ onSend, onStop, isStreaming, autoFocus, placeholder = "Message Orbit AI…" }: Props) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0 && !isStreaming;

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  };

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, [contenteditable='true']");
      if (e.key === "/" && !typing) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = () => {
    if (!canSend) return;
    onSend(value);
    setValue("");
    requestAnimationFrame(() => {
      if (ref.current) ref.current.style.height = "auto";
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div>
      <div
        className={cn(
          "composer rounded-[22px] border border-line bg-surface transition-[border-color,box-shadow]",
          "focus-within:border-accent/45",
        )}
        onClick={() => ref.current?.focus()}
      >
        <textarea
          ref={ref}
          rows={1}
          value={value}
          placeholder={placeholder}
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
          <span className="hidden items-center gap-3 pl-1.5 text-xs text-subtle sm:flex">
            <span>
              <kbd className="kbd">Enter</kbd> to send
            </span>
            <span>
              <kbd className="kbd">Shift</kbd> + <kbd className="kbd">Enter</kbd> new line
            </span>
          </span>
          <span className="sm:hidden" />
          {isStreaming ? (
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
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-subtle">Orbit AI can make mistakes. Check important results.</p>
    </div>
  );
}
