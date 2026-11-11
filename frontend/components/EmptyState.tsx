"use client";

import { ArrowUpRight, Calculator, Clock, CodeXml, Globe } from "lucide-react";
import { greeting, modKey } from "@/lib/utils";
import { Composer } from "./Composer";

const SUGGESTIONS = [
  { icon: Calculator, title: "Crunch some numbers", prompt: "What is 18% of 2,450, plus 312?" },
  { icon: Globe, title: "Search the web", prompt: "What are the most notable new features in Python 3.14?" },
  { icon: Clock, title: "Check the time", prompt: "What time is it in Tokyo right now?" },
  { icon: CodeXml, title: "Write some code", prompt: "Write a Python function that flattens a nested list." },
];

type Props = {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
};

export function EmptyState({ onSend, onStop, isStreaming }: Props) {
  const mod = modKey();

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden />

      <div className="relative m-auto w-full max-w-2xl px-4 py-10 md:px-6">
        <div className="animate-in mb-9 flex flex-col items-center text-center">
          <h1 className="text-[34px] leading-[1.15] font-semibold tracking-[-0.02em] text-ink md:text-[40px]">
            {greeting()}
          </h1>
          <p className="mt-2.5 max-w-md text-[15px] leading-relaxed text-muted">
            Ask anything, or tap the mic and just talk. Orbit AI reasons, calls tools, and shows you every step.
          </p>
        </div>

        <div className="animate-in" style={{ animationDelay: "60ms" }}>
          <Composer onSend={onSend} onStop={onStop} isStreaming={isStreaming} autoFocus />
        </div>

        <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
          {SUGGESTIONS.map(({ icon: Icon, title, prompt }, i) => (
            <button
              key={title}
              type="button"
              onClick={() => onSend(prompt)}
              className="animate-in group relative flex items-start gap-3 rounded-2xl border border-line bg-surface/70 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-accent/35 hover:bg-surface hover:shadow-[0_10px_24px_-16px_rgb(0_0_0/0.35)]"
              style={{ animationDelay: `${120 + i * 50}ms` }}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition-transform group-hover:scale-105">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 pr-5">
                <span className="block text-sm font-semibold text-ink">{title}</span>
                <span className="mt-0.5 line-clamp-2 block text-[13px] leading-5 text-muted">{prompt}</span>
              </span>
              <ArrowUpRight className="absolute top-3.5 right-3.5 size-4 text-subtle opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent group-hover:opacity-100" />
            </button>
          ))}
        </div>

        <p
          className="animate-in mt-6 hidden flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-subtle md:flex"
          style={{ animationDelay: "340ms" }}
        >
          <span className="flex items-center gap-1.5">
            <kbd className="kbd">{mod}</kbd>
            <kbd className="kbd">K</kbd>
            search chats
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="kbd">/</kbd>
            focus message
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="kbd">{mod}</kbd>
            <kbd className="kbd">/</kbd>
            all shortcuts
          </span>
        </p>
      </div>
    </div>
  );
}
