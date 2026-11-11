"use client";

import { Calculator, Clock, CodeXml, Globe } from "lucide-react";
import { greeting } from "@/lib/utils";
import { Composer } from "./Composer";
import { LogoMark } from "./Logo";

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
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="m-auto w-full max-w-2xl px-4 py-10 md:px-6">
        <div className="animate-in mb-8 flex flex-col items-center text-center">
          <LogoMark size={44} />
          <h1 className="mt-5 font-serif text-[42px] leading-[1.1] tracking-tight text-ink md:text-[52px]">
            {greeting()}
          </h1>
          <p className="mt-3 max-w-md text-[15px] text-muted">
            Ask anything. Orbit reasons, calls tools, and shows you every step it takes.
          </p>
        </div>

        <div className="animate-in" style={{ animationDelay: "60ms" }}>
          <Composer onSend={onSend} onStop={onStop} isStreaming={isStreaming} autoFocus />
        </div>

        <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {SUGGESTIONS.map(({ icon: Icon, title, prompt }, i) => (
            <button
              key={title}
              type="button"
              onClick={() => onSend(prompt)}
              className="animate-in group flex items-start gap-3 rounded-2xl border border-line bg-surface/60 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-accent/35 hover:bg-surface"
              style={{ animationDelay: `${120 + i * 50}ms` }}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{title}</span>
                <span className="mt-0.5 line-clamp-2 block text-[13px] leading-5 text-muted">{prompt}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
