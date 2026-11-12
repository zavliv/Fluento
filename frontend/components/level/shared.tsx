"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CEFR_LEVELS, type CefrLevel } from "@/lib/api";
import { speak, stopSpeech } from "@/lib/speech";
import { cn } from "@/lib/utils";

export const rank = (level: CefrLevel) => CEFR_LEVELS.indexOf(level);

export function when(value: string) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return shortDate(value);
}

export function shortDate(value: string) {
  return new Date(value).toLocaleDateString([], { day: "numeric", month: "short" });
}

export function FocusBar({
  onClose,
  closeLabel = "Close level test",
  progress,
  right,
}: {
  onClose: () => void;
  closeLabel?: string;
  progress?: number;
  right?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl shrink-0 items-center gap-4 px-4 pt-4 pb-2 md:px-6 md:pt-6">
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        title={closeLabel}
        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-hover hover:text-ink"
      >
        <X className="size-5" />
      </button>
      {progress !== undefined ? (
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-hover" role="progressbar" aria-valuenow={progress}>
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${Math.max(3, progress)}%` }}
          />
        </div>
      ) : (
        <span className="flex-1" />
      )}
      {right && <div className="flex shrink-0 items-center">{right}</div>}
    </div>
  );
}

export function Centered({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="flex min-h-0 flex-1 overflow-y-auto">
      <div className={cn("m-auto w-full max-w-xl px-5 py-10 text-center", className)}>{children}</div>
    </div>
  );
}

export function PrimaryButton({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-[15px] font-semibold text-accent-ink transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:opacity-60",
        className,
      )}
    />
  );
}

export function SecondaryButton({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-5 text-sm font-semibold text-ink transition-colors hover:border-accent/40 disabled:opacity-60",
        className,
      )}
    />
  );
}

export function LevelBadge({ level, size = "md" }: { level: CefrLevel; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-accent font-bold tracking-[-0.02em] text-accent-ink",
        size === "sm" && "size-10 rounded-xl text-sm",
        size === "md" && "size-12 rounded-2xl text-lg",
        size === "lg" && "size-[72px] rounded-[20px] text-[28px]",
        size === "xl" && "size-32 rounded-[32px] text-[52px]",
      )}
    >
      {level}
    </span>
  );
}

export function SkillBar({ label, level, change }: { label: string; level: CefrLevel; change?: ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted">{label}</span>
        <span className="flex items-center gap-2">
          {change}
          <span className="font-semibold text-ink">{level}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-hover">
        <div className="h-full rounded-full bg-accent" style={{ width: `${((rank(level) + 1) / 6) * 100}%` }} />
      </div>
    </div>
  );
}

export function useSpeaker() {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const supported = typeof window !== "undefined";

  const stop = useCallback(() => {
    stopSpeech();
    setPlaying(false);
    setLoading(false);
  }, []);

  const say = useCallback((text: string) => {
    setLoading(true);
    setPlaying(false);
    void speak(text, {
      onStart: () => {
        setLoading(false);
        setPlaying(true);
      },
      onEnd: () => {
        setLoading(false);
        setPlaying(false);
      },
    });
  }, []);

  useEffect(() => () => stopSpeech(), []);
  return { speak: say, stop, playing, loading, supported };
}
