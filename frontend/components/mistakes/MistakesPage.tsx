"use client";

import { ArrowRight, Check, LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api, type Mistake, type MistakeCategory, type MistakeSummary } from "@/lib/api";
import type { Teacher } from "@/lib/teachers";
import { cn } from "@/lib/utils";
import { IconButton } from "../IconButton";
import { TeacherAvatar } from "../TeacherAvatar";
import { useToast } from "../ui/Toast";

type Status = "open" | "mastered";

type Props = {
  teachers: Teacher[];
  summary: MistakeSummary | null;
  onChanged: () => void;
  onPractise: (mistake: Pick<Mistake, "rule" | "original" | "correction"> & { teacher_id?: string }) => void;
};

function ago(value: string) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(value).toLocaleDateString([], { day: "numeric", month: "short" });
}

export function MistakesPage({ teachers, summary, onChanged, onPractise }: Props) {
  const toast = useToast();
  const [status, setStatus] = useState<Status>("open");
  const [category, setCategory] = useState<MistakeCategory | null>(null);
  const [mistakes, setMistakes] = useState<Mistake[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const byId = Object.fromEntries(teachers.map((t) => [t.id, t]));

  const load = useCallback(() => {
    api
      .mistakes({ status, category: category ?? undefined })
      .then((list) => {
        setMistakes(list);
        setError(null);
      })
      .catch((err: Error) => setError(err.message));
  }, [status, category]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (mistake: Mistake) => {
    setMistakes((list) => list?.filter((m) => m.id !== mistake.id) ?? null);
    try {
      await api.setMistakeMastered(mistake.id, !mistake.mastered);
      toast({ message: mistake.mastered ? "Moved back to review" : "Nice! Marked as learned" });
      onChanged();
    } catch (err) {
      load();
      toast({ message: err instanceof Error ? err.message : "Couldn't update the mistake" });
    }
  };

  const remove = async (mistake: Mistake) => {
    setMistakes((list) => list?.filter((m) => m.id !== mistake.id) ?? null);
    try {
      await api.deleteMistake(mistake.id);
      onChanged();
    } catch (err) {
      load();
      toast({ message: err instanceof Error ? err.message : "Couldn't delete the mistake" });
    }
  };

  const stats = [
    { label: "To review", value: summary?.open },
    { label: "Learned", value: summary?.mastered },
    { label: "This week", value: summary?.this_week },
  ];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 md:px-6">
        {summary && !summary.enabled && (
          <p className="mb-4 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
            Mistake tracking is turned off right now, so new mistakes aren&apos;t being saved.
          </p>
        )}

        <div className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-line bg-surface px-4 py-3.5">
              <p className="text-xs font-medium text-muted">{s.label}</p>
              <p className="mt-1 text-2xl font-bold tracking-[-0.02em] text-ink tabular-nums">{s.value ?? "–"}</p>
            </div>
          ))}
        </div>

        {summary && summary.top_rules.length > 0 && (
          <section className="mt-6 rounded-2xl border border-line bg-surface">
            <div className="border-b border-line px-5 py-3.5">
              <h2 className="text-[15px] font-semibold text-ink">Your top patterns</h2>
              <p className="text-xs text-muted">The rules you get wrong most often. Practise one with a teacher.</p>
            </div>
            <ul className="divide-y divide-line">
              {summary.top_rules.map((r) => (
                <li key={r.rule} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink first-letter:uppercase">{r.rule}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      <span className="text-danger line-through decoration-danger/50">{r.original}</span>
                      <span className="mx-1.5 text-subtle">→</span>
                      <span className="font-medium text-success">{r.correction}</span>
                    </p>
                  </div>
                  <span className="rounded-full bg-hover px-2 py-0.5 text-xs font-semibold text-muted tabular-nums">
                    {r.count}×
                  </span>
                  <button
                    type="button"
                    onClick={() => onPractise(r)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold text-ink transition-colors hover:border-accent/40"
                  >
                    Practise
                    <ArrowRight className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" className="inline-flex gap-0.5 rounded-xl bg-hover p-0.5">
            {(["open", "mastered"] as Status[]).map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={status === s}
                onClick={() => setStatus(s)}
                className={cn(
                  "h-8 rounded-[10px] px-3.5 text-sm transition-all",
                  status === s ? "bg-surface font-semibold text-ink shadow-sm" : "text-muted hover:text-ink",
                )}
              >
                {s === "open" ? "To review" : "Learned"}
              </button>
            ))}
          </div>
          {status === "open" && summary && summary.categories.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {[{ category: null, count: summary.open }, ...summary.categories].map((c) => (
                <button
                  key={c.category ?? "all"}
                  type="button"
                  onClick={() => setCategory(c.category)}
                  className={cn(
                    "h-8 rounded-full border px-3 text-xs font-medium capitalize transition-colors",
                    category === c.category
                      ? "border-ink bg-ink text-bg"
                      : "border-line text-muted hover:border-accent/40 hover:text-ink",
                  )}
                >
                  {c.category ?? "All"} <span className="opacity-60 tabular-nums">{c.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4">
          {error ? (
            <p className="rounded-xl border border-danger/25 bg-danger/6 px-4 py-3 text-sm text-danger">{error}</p>
          ) : mistakes === null ? (
            <div className="flex justify-center py-16 text-subtle">
              <LoaderCircle className="size-5 animate-spin" aria-label="Loading" />
            </div>
          ) : mistakes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
              <p className="text-sm font-semibold text-ink">
                {status === "open" ? "Nothing to review" : "Nothing marked as learned yet"}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                {status === "open"
                  ? "Chat with any teacher. Mistakes in your messages show up here a few seconds later."
                  : "When you've got the hang of a mistake, mark it as learned and it moves here."}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {mistakes.map((m) => {
                const teacher = byId[m.teacher_id];
                return (
                  <li key={m.id} className="rounded-2xl border border-line bg-surface p-4 md:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[15px] leading-relaxed">
                        <span className="text-danger line-through decoration-danger/50">{m.original}</span>
                        <span className="mx-2 text-subtle">→</span>
                        <span className="font-semibold text-success">{m.correction}</span>
                      </p>
                      <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-muted capitalize">
                        {m.category}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-ink first-letter:uppercase">{m.rule}</p>
                    {m.explanation && <p className="mt-0.5 text-sm leading-relaxed text-muted">{m.explanation}</p>}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-xs text-subtle">
                        {teacher && <TeacherAvatar name={teacher.name} color={teacher.color} size={20} />}
                        {teacher ? `With ${teacher.name}` : "Teacher removed"} · {ago(m.created_at)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <IconButton label="Delete" onClick={() => void remove(m)}>
                          <Trash2 />
                        </IconButton>
                        <button
                          type="button"
                          onClick={() => void toggle(m)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold text-ink transition-colors hover:border-accent/40"
                        >
                          {m.mastered ? <RotateCcw className="size-3.5" /> : <Check className="size-3.5" />}
                          {m.mastered ? "Review again" : "Mark as learned"}
                        </button>
                        {!m.mastered && (
                          <button
                            type="button"
                            onClick={() => onPractise(m)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink px-3 text-xs font-semibold text-bg transition-opacity hover:opacity-90"
                          >
                            Practise
                            <ArrowRight className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
