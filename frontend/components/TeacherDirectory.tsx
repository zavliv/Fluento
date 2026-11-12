"use client";

import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { GOALS, type Teacher, type TeacherGoal } from "@/lib/teachers";
import { cn, greeting } from "@/lib/utils";
import { TeacherAvatar } from "./TeacherAvatar";

type Props = {
  teachers: Teacher[];
  online: boolean | null;
  myTeacherIds: string[];
  onSelect: (teacherId: string) => void;
};

type Filter = "all" | TeacherGoal;

export function TeacherDirectory({ teachers, online, myTeacherIds, onSelect }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const presence = online === null ? null : online ? "online" : "offline";

  const visible = useMemo(
    () => (filter === "all" ? teachers : teachers.filter((t) => t.goals.includes(filter))),
    [teachers, filter],
  );

  const beginnerPick = teachers.find((t) => t.id === "maya") ?? teachers[0];

  return (
    <div className="relative min-h-0 flex-1 overflow-y-auto">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-10 md:px-8 md:py-14">
        <header className="animate-in text-center">
          <p className="text-sm font-semibold text-accent">{greeting()}</p>
          <h1 className="mt-2 text-[32px] leading-[1.15] font-bold tracking-[-0.025em] text-ink md:text-[42px]">
            Who would you like to learn with?
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
            Every teacher has their own style. Pick one, start talking, and they&apos;ll correct your English as you go.
          </p>
        </header>

        <div className="animate-in mt-8 flex flex-col items-center gap-3" style={{ animationDelay: "60ms" }}>
          <p className="text-xs font-medium tracking-wider text-subtle uppercase">What do you want to improve?</p>
          <div className="flex flex-wrap justify-center gap-1.5" role="tablist" aria-label="Filter teachers by goal">
            {[{ id: "all" as const, label: "All teachers" }, ...GOALS].map((goal) => (
              <button
                key={goal.id}
                type="button"
                role="tab"
                aria-selected={filter === goal.id}
                onClick={() => setFilter(goal.id)}
                className={cn(
                  "h-9 rounded-full border px-4 text-sm font-medium transition-all",
                  filter === goal.id
                    ? "border-ink bg-ink text-bg"
                    : "border-line bg-surface text-muted hover:border-accent/40 hover:text-ink",
                )}
              >
                {goal.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((teacher, i) => {
            const added = myTeacherIds.includes(teacher.id);
            return (
              <button
                key={teacher.id}
                type="button"
                onClick={() => onSelect(teacher.id)}
                className="animate-in group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-[var(--teacher-border)] hover:shadow-[0_20px_40px_-24px_var(--teacher-shadow)]"
                style={
                  {
                    animationDelay: `${90 + i * 35}ms`,
                    "--teacher-border": `color-mix(in srgb, ${teacher.color} 45%, transparent)`,
                    "--teacher-shadow": `color-mix(in srgb, ${teacher.color} 60%, transparent)`,
                  } as React.CSSProperties
                }
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-60 transition-opacity group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(80% 100% at 30% 0%, color-mix(in srgb, ${teacher.color} 22%, transparent), transparent 75%)`,
                  }}
                />

                <span className="relative flex items-start justify-between">
                  <TeacherAvatar
                    name={teacher.name}
                    color={teacher.color}
                    size={52}
                    ring="var(--surface)"
                    presence={presence}
                  />
                  {added ? (
                    <span className="flex items-center gap-1 rounded-full bg-hover px-2 py-0.5 text-[11px] font-medium text-muted">
                      <Check className="size-3" />
                      In your list
                    </span>
                  ) : (
                    <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-muted">
                      {teacher.level}
                    </span>
                  )}
                </span>

                <span className="relative mt-4 block text-lg font-bold tracking-[-0.01em] text-ink">
                  {teacher.name}
                </span>
                <span className="relative block text-sm font-semibold" style={{ color: teacher.color }}>
                  {teacher.specialty}
                </span>
                <span className="relative mt-2 block text-sm leading-relaxed text-muted">{teacher.tagline}</span>

                <span className="relative mt-4 flex flex-wrap gap-1.5">
                  {teacher.tags.map((tag) => (
                    <span key={tag} className="rounded-md bg-hover px-2 py-1 text-[11.5px] font-medium text-muted">
                      {tag}
                    </span>
                  ))}
                </span>

                <span className="min-h-5 flex-1" aria-hidden />
                <span
                  className="relative flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5 text-sm font-semibold text-ink transition-colors group-hover:border-transparent group-hover:bg-[var(--teacher-fill)]"
                  style={
                    {
                      "--teacher-fill": `color-mix(in srgb, ${teacher.color} 14%, transparent)`,
                    } as React.CSSProperties
                  }
                >
                  {added ? `Continue with ${teacher.name}` : `Talk to ${teacher.name}`}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            );
          })}

          {filter === "all" && beginnerPick && (
            <div
              className="animate-in flex flex-col justify-between rounded-3xl border border-dashed border-line p-5"
              style={{ animationDelay: `${90 + visible.length * 35}ms` }}
            >
              <div>
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Sparkles className="size-5" />
                </span>
                <p className="mt-4 text-lg font-bold tracking-[-0.01em] text-ink">Not sure who to pick?</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Start with {beginnerPick.name}. She&apos;s patient, friendly and perfect for building confidence.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelect(beginnerPick.id)}
                className="mt-5 flex items-center justify-between rounded-xl bg-accent px-3.5 py-2.5 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90"
              >
                Start with {beginnerPick.name}
                <ArrowRight className="size-4" />
              </button>
            </div>
          )}
        </div>

        {visible.length === 0 && <p className="mt-10 text-center text-sm text-muted">No teachers for this goal yet.</p>}
      </div>
    </div>
  );
}
