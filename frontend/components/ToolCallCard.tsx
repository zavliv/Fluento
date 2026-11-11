"use client";

import { Check, ChevronDown, LoaderCircle, Wrench, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { ToolPart } from "@/lib/types";
import { cn } from "@/lib/utils";

function preview(input: unknown) {
  try {
    const text = typeof input === "string" ? input : JSON.stringify(input);
    return text.length > 64 ? `${text.slice(0, 64)}…` : text;
  } catch {
    return "";
  }
}

function pretty(value: unknown) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function ToolCallCard({ part }: { part: ToolPart }) {
  const [open, setOpen] = useState(false);
  const running = part.status === "running";
  const duration = part.endedAt ? `${((part.endedAt - part.startedAt) / 1000).toFixed(1)}s` : null;

  return (
    <div
      className={cn(
        "my-3 overflow-hidden rounded-xl border bg-surface transition-colors",
        running ? "border-accent/40" : "border-line",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-hover/60"
      >
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md [&_svg]:size-3.5",
            running && "bg-accent-soft text-accent",
            part.status === "done" && "bg-success/12 text-success",
            part.status === "error" && "bg-danger/12 text-danger",
          )}
        >
          {running ? <LoaderCircle className="animate-spin" /> : part.status === "done" ? <Check /> : <X />}
        </span>
        <span className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="shrink-0 text-sm text-muted">{running ? "Using" : "Used"}</span>
          <span className="shrink-0 font-mono text-[13px] font-medium text-ink">{part.name}</span>
          <span className="truncate font-mono text-xs text-subtle">{preview(part.input)}</span>
        </span>
        {duration && <span className="shrink-0 text-xs text-subtle tabular-nums">{duration}</span>}
        <ChevronDown className={cn("size-4 shrink-0 text-subtle transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-line bg-bg/60 px-3 py-3">
          <ToolSection label="Input" icon={<Wrench />} body={pretty(part.input)} />
          <ToolSection
            label={part.status === "error" ? "Error" : "Output"}
            body={part.output ?? (running ? "Waiting for result…" : "No output")}
            tone={part.status === "error" ? "danger" : undefined}
          />
        </div>
      )}
    </div>
  );
}

function ToolSection({ label, body, icon, tone }: { label: string; body: string; icon?: ReactNode; tone?: "danger" }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium tracking-wider text-subtle uppercase [&_svg]:size-3">
        {icon}
        {label}
      </div>
      <pre
        className={cn(
          "max-h-64 overflow-auto rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs leading-5 whitespace-pre-wrap break-words",
          tone === "danger" ? "text-danger" : "text-ink",
        )}
      >
        {body}
      </pre>
    </div>
  );
}
