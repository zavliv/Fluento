"use client";

import { ClipboardCheck } from "lucide-react";
import type { ReactNode } from "react";
import { CEFR_LEVELS, type CefrLevel } from "@/lib/api";
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

export function Shell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className={cn("mx-auto w-full px-4 py-10 md:px-8", wide ? "max-w-4xl" : "max-w-3xl")}>{children}</div>
    </div>
  );
}

export function Panel({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-surface p-5", className)}>
      {title && <h2 className="mb-3 text-[15px] font-semibold text-ink">{title}</h2>}
      {children}
    </section>
  );
}

export function PrimaryButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-[15px] font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60",
        className,
      )}
    />
  );
}

export function SecondaryButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold text-ink transition-colors hover:border-accent/40 disabled:opacity-60",
        className,
      )}
    />
  );
}

export function ExaminerAvatar() {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-bg">
      <ClipboardCheck className="size-4" />
    </span>
  );
}

export function LevelBadge({ level, large }: { level: CefrLevel; large?: boolean }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl bg-accent font-bold tracking-[-0.02em] text-accent-ink",
        large ? "size-20 text-[32px]" : "size-12 text-lg",
      )}
    >
      {level}
    </span>
  );
}

export function LevelScale({ level }: { level: CefrLevel }) {
  const index = rank(level);
  return (
    <div className="flex gap-1" aria-hidden>
      {CEFR_LEVELS.map((l, i) => (
        <span key={l} className="flex-1">
          <span className={cn("block h-1.5 rounded-full", i <= index ? "bg-accent" : "bg-hover")} />
          <span
            className={cn("mt-1.5 block text-center text-[11px]", i === index ? "font-bold text-ink" : "text-subtle")}
          >
            {l}
          </span>
        </span>
      ))}
    </div>
  );
}
