"use client";

import { X } from "lucide-react";
import type { LearnerMemory, MemoryFields } from "@/lib/api";
import { cn } from "@/lib/utils";

type ListKey = "goals" | "interests" | "facts" | "strengths";

const SECTIONS: { key: ListKey; title: string }[] = [
  { key: "goals", title: "Goals" },
  { key: "facts", title: "About you" },
  { key: "interests", title: "Interests" },
  { key: "strengths", title: "Strengths" },
];

const LEVELS: Record<string, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper intermediate",
  C1: "Advanced",
  C2: "Proficient",
};

type Props = {
  memory: LearnerMemory;
  onChange?: (next: MemoryFields) => void;
  perspective?: "learner" | "admin";
};

export function MemoryView({ memory, onChange, perspective = "learner" }: Props) {
  const editable = Boolean(onChange);
  const base: MemoryFields = {
    summary: memory.summary,
    level: memory.level,
    goals: memory.goals,
    interests: memory.interests,
    facts: memory.facts,
    strengths: memory.strengths,
    mistakes: memory.mistakes,
  };
  const removeItem = (key: ListKey, index: number) =>
    onChange?.({ ...base, [key]: base[key].filter((_, i) => i !== index) });

  return (
    <div className="space-y-5">
      {(memory.level || memory.summary) && (
        <div className="rounded-xl bg-hover/70 p-4">
          {memory.level && (
            <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-ink">
              <span className="rounded-md bg-accent px-1.5 py-0.5 font-mono text-[11px] text-accent-ink">
                {memory.level}
              </span>
              {LEVELS[memory.level]} (estimated)
            </p>
          )}
          {memory.summary && <p className="text-sm leading-relaxed text-muted">{memory.summary}</p>}
        </div>
      )}

      {SECTIONS.filter((s) => memory[s.key].length > 0).map(({ key, title }) => (
        <section key={key}>
          <h3 className="mb-2 text-xs font-semibold tracking-wider text-subtle uppercase">
            {perspective === "admin" && key === "facts" ? "About them" : title}
          </h3>
          <ul className="flex flex-wrap gap-1.5">
            {memory[key].map((item, i) => (
              <li
                key={`${item}-${i}`}
                className={cn(
                  "flex items-center gap-1 rounded-full border border-line bg-surface py-1 text-[13px] text-ink",
                  editable ? "pr-1 pl-3" : "px-3",
                )}
              >
                {item}
                {editable && (
                  <button
                    type="button"
                    onClick={() => removeItem(key, i)}
                    aria-label={`Forget “${item}”`}
                    title="Forget this"
                    className="flex size-5 items-center justify-center rounded-full text-subtle hover:bg-hover hover:text-danger"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {memory.mistakes.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold tracking-wider text-subtle uppercase">Mistakes to work on</h3>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {memory.mistakes.map((m, i) => (
              <li key={`${m.pattern}-${i}`} className="flex items-start gap-3 px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink first-letter:uppercase">{m.pattern}</p>
                  {m.example && (
                    <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                      <span className="text-danger line-through decoration-danger/50">{m.example}</span>
                      {m.correction && (
                        <>
                          {" → "}
                          <span className="text-success">{m.correction}</span>
                        </>
                      )}
                    </p>
                  )}
                </div>
                <span className="mt-0.5 shrink-0 rounded-full bg-hover px-2 py-0.5 font-mono text-[11px] text-muted tabular-nums">
                  {m.count}×
                </span>
                {editable && (
                  <button
                    type="button"
                    onClick={() => onChange?.({ ...base, mistakes: base.mistakes.filter((_, j) => j !== i) })}
                    aria-label={`Forget “${m.pattern}”`}
                    title="Forget this"
                    className="flex size-6 shrink-0 items-center justify-center rounded-full text-subtle hover:bg-hover hover:text-danger"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function memoryIsEmpty(memory: LearnerMemory | null) {
  if (!memory) return true;
  return (
    !memory.summary &&
    !memory.level &&
    [memory.goals, memory.interests, memory.facts, memory.strengths, memory.mistakes].every((l) => l.length === 0)
  );
}
