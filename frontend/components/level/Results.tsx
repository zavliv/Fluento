"use client";

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  ListChecks,
  LoaderCircle,
  MessagesSquare,
  Mic,
  RotateCcw,
  Share2,
  Target,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { LEVEL_NAMES, type CefrLevel, type LevelHistoryItem, type LevelTest } from "@/lib/api";
import type { Teacher } from "@/lib/teachers";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "../SiteSettings";
import { TeacherAvatar } from "../TeacherAvatar";
import { useToast } from "../ui/Toast";
import { LevelBadge, LevelScale, Panel, SecondaryButton, Shell, rank, shortDate, when } from "./shared";

function copyText(text: string) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  area.remove();
  if (!copied) void navigator.clipboard?.writeText(text).catch(() => {});
  return copied || Boolean(navigator.clipboard);
}

const SKILLS = [
  ["grammar", "Grammar"],
  ["vocabulary", "Vocabulary"],
  ["fluency", "Fluency"],
  ["comprehension", "Understanding"],
] as const;

function Change({ from, to }: { from: CefrLevel; to: CefrLevel }) {
  const diff = rank(to) - rank(from);
  if (diff === 0) return <span className="text-xs text-subtle">same as before</span>;
  const up = diff > 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", up ? "text-success" : "text-danger")}>
      {up ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
      {up ? "up" : "down"} from {from}
    </span>
  );
}

export function ResultView({
  test,
  history,
  teachers,
  onOpenTeacher,
  onPractise,
  onRetake,
  retaking,
}: {
  test: LevelTest;
  history: LevelHistoryItem[];
  teachers: Teacher[];
  onOpenTeacher: (id: string) => void;
  onPractise: (teacherId: string, text: string) => void;
  onRetake: () => void;
  retaking: boolean;
}) {
  const result = test.result!;
  const toast = useToast();
  const { app_name } = useSiteSettings();
  const share = async () => {
    const text = `I just took the ${app_name} English level test: ${result.level} (${LEVEL_NAMES[result.level]})! What's your level?`;
    const url = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({ title: `My English level: ${result.level}`, text, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    toast({
      message: copyText(`${text} ${url}`)
        ? "Copied! Paste it anywhere to share your result."
        : "Couldn't copy. Try again.",
    });
  };
  const byId = Object.fromEntries(teachers.map((t) => [t.id, t]));
  const teacher = result.recommended_teacher_id ? byId[result.recommended_teacher_id] : undefined;
  const finishedAt = test.completed_at ?? test.created_at;
  const previous = [...history]
    .filter((h) => h.id !== test.id && new Date(h.completed_at) < new Date(finishedAt))
    .pop();
  const answers = test.messages.filter((m) => m.role === "learner");
  const questions = test.messages.filter((m) => m.role === "examiner");
  const spoken = answers.filter((m) => m.mode === "voice").length;

  return (
    <Shell wide>
      <section className="animate-in rounded-3xl border border-line bg-surface p-6 md:p-8">
        <p className="text-xs font-semibold tracking-wider text-subtle uppercase">Your English level</p>
        <div className="mt-4 flex flex-wrap items-center gap-5">
          <LevelBadge level={result.level} large />
          <div className="min-w-0 flex-1">
            <h1 className="text-[28px] leading-tight font-bold tracking-[-0.025em] text-ink">
              {LEVEL_NAMES[result.level]}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
              CEFR {result.level} · tested {when(finishedAt)}
              {previous && <Change from={previous.level} to={result.level} />}
            </p>
          </div>
        </div>
        <div className="mt-6">
          <LevelScale level={result.level} />
        </div>
        <p className="mt-6 text-[15px] leading-relaxed text-ink">{result.summary}</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          {result.quiz_total != null && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-muted">
              <ListChecks className="size-3.5" />
              Quick check: {result.quiz_correct} of {result.quiz_total} correct
              {result.quiz_level && ` · about ${result.quiz_level}`}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-muted">
            <MessagesSquare className="size-3.5" />
            Conversation: {answers.length} answers{spoken > 0 && `, ${spoken} spoken`}
          </span>
        </div>
      </section>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Panel title="Skills">
          <ul className="space-y-3.5">
            {SKILLS.map(([key, label]) => {
              const level = result.scores[key];
              return (
                <li key={key}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted">{label}</span>
                    <span className="flex items-center gap-2">
                      {previous && previous.scores[key] !== level && <Change from={previous.scores[key]} to={level} />}
                      <span className="font-semibold text-ink">{level}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-hover">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${((rank(level) + 1) / 6) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel>
          <h2 className="text-[15px] font-semibold text-ink">What you do well</h2>
          <ul className="mt-3 space-y-2">
            {result.strengths.map((s) => (
              <li key={s} className="flex gap-2 text-sm leading-relaxed text-ink">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                {s}
              </li>
            ))}
          </ul>
          <h2 className="mt-5 text-[15px] font-semibold text-ink">What to work on next</h2>
          <ul className="mt-3 space-y-2">
            {result.improvements.map((s) => (
              <li key={s} className="flex gap-2 text-sm leading-relaxed text-ink">
                <Target className="mt-0.5 size-4 shrink-0 text-accent" />
                {s}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {result.plan.length > 0 && (
        <section className="mt-5">
          <h2 className="text-[17px] font-bold tracking-[-0.01em] text-ink">Your study plan</h2>
          <p className="mt-1 text-sm text-muted">
            Three next steps. Each one opens the right teacher with a message ready.
          </p>
          <ol className="mt-4 grid gap-3 md:grid-cols-3">
            {result.plan.map((step, i) => {
              const t = step.teacher_id ? byId[step.teacher_id] : undefined;
              return (
                <li key={step.title} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
                  <span className="font-mono text-xs font-bold text-accent">0{i + 1}</span>
                  <p className="mt-2 text-[15px] font-semibold text-ink">{step.title}</p>
                  <p className="mt-1 flex-1 text-sm leading-relaxed text-muted">{step.detail}</p>
                  {t && (
                    <button
                      type="button"
                      onClick={() => onPractise(t.id, step.practice_prompt || `Can we practise this: ${step.title}?`)}
                      className="mt-4 inline-flex h-9 max-w-full items-center gap-2 self-start rounded-lg border border-line pr-3 pl-1.5 text-sm font-semibold whitespace-nowrap text-ink transition-colors hover:border-accent/40"
                    >
                      <TeacherAvatar name={t.name} color={t.color} size={24} />
                      Practise with {t.name}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {result.answer_feedback.length > 0 && (
        <Collapsible title="Review your answers" subtitle="See how each answer could sound one step higher.">
          <ol className="divide-y divide-line">
            {answers.map((answer, i) => {
              const feedback = result.answer_feedback[i];
              return (
                <li key={i} className="px-5 py-4">
                  <p className="text-xs text-subtle">
                    Q{i + 1}. {questions[i]?.content}
                  </p>
                  <p className="mt-2 flex items-start gap-2 text-sm text-ink">
                    <span className="mt-0.5 w-16 shrink-0 text-xs font-semibold text-muted">You</span>
                    <span className="min-w-0">
                      {answer.content}
                      {answer.mode === "voice" && <Mic className="ml-1.5 inline size-3 text-subtle" />}
                    </span>
                  </p>
                  {feedback?.improved && feedback.improved !== answer.content && (
                    <p className="mt-1.5 flex items-start gap-2 text-sm text-ink">
                      <span className="mt-0.5 w-16 shrink-0 text-xs font-semibold text-success">Better</span>
                      <span className="min-w-0">{feedback.improved}</span>
                    </p>
                  )}
                  {feedback?.tip && (
                    <p className="mt-2 ml-[72px] rounded-lg bg-hover px-3 py-2 text-xs leading-relaxed text-muted">
                      {feedback.tip}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </Collapsible>
      )}

      {test.quiz_review.length > 0 && (
        <Collapsible
          title="Quick check answers"
          subtitle={`${test.quiz_review.filter((q) => q.correct).length} of ${test.quiz_review.length} correct`}
        >
          <ol className="divide-y divide-line">
            {test.quiz_review.map((q, i) => (
              <li key={i} className="flex gap-3 px-5 py-3.5">
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                    q.correct ? "bg-success/15 text-success" : "bg-danger/10 text-danger",
                  )}
                >
                  {q.correct ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                </span>
                <div className="min-w-0 text-sm">
                  <p className="text-ink">{q.question.replace("___", `“${q.options[q.answer_index]}”`)}</p>
                  <p className="mt-1 text-xs text-muted">
                    {q.level} {q.skill}
                    {!q.correct && (
                      <>
                        {" "}
                        ·{" "}
                        {q.format === "judge" ? (
                          <>
                            you said “{q.options[q.shown ?? q.answer_index]}”{" "}
                            {q.chosen === 0 ? "sounded right" : "sounded wrong"}
                          </>
                        ) : (
                          <>
                            you chose <span className="text-danger line-through">{q.options[q.chosen]}</span>
                          </>
                        )}
                      </>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Collapsible>
      )}

      {history.length > 1 && <Progress history={history} />}

      {teacher && (
        <section
          className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border bg-surface p-5"
          style={{ borderColor: `color-mix(in srgb, ${teacher.color} 30%, var(--line))` }}
        >
          <TeacherAvatar name={teacher.name} color={teacher.color} size={48} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wider text-subtle uppercase">Best teacher for you</p>
            <p className="mt-0.5 text-[15px] font-semibold text-ink">
              {teacher.name} <span className="font-normal text-muted">· {teacher.specialty}</span>
            </p>
            {result.recommendation_reason && (
              <p className="mt-0.5 text-sm text-muted">{result.recommendation_reason}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenTeacher(teacher.id)}
            className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: teacher.color }}
          >
            Talk to {teacher.name}
            <ArrowRight className="size-4" />
          </button>
        </section>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">All your teachers now adapt their English to {result.level}.</p>
        <div className="flex gap-2">
          <SecondaryButton onClick={() => void share()}>
            <Share2 className="size-4" />
            Share my result
          </SecondaryButton>
          <SecondaryButton onClick={onRetake} disabled={retaking}>
            {retaking ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
            Retake
          </SecondaryButton>
        </div>
      </div>
    </Shell>
  );
}

function Collapsible({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-hover/60"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink">{title}</span>
          <span className="block text-xs text-muted">{subtitle}</span>
        </span>
        <ChevronDown className={cn("size-4 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="border-t border-line">{children}</div>}
    </section>
  );
}

function Progress({ history }: { history: LevelHistoryItem[] }) {
  const points = history.slice(-8);
  const first = points[0];
  const last = points[points.length - 1];
  return (
    <Panel className="mt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-ink">Your progress</h2>
        <span className="text-xs text-muted">
          {first.level} on {shortDate(first.completed_at)} → {last.level} now
        </span>
      </div>
      <div className="mt-4 flex h-36 items-end gap-2">
        {points.map((p) => (
          <div key={p.id} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-xs font-semibold text-ink">{p.level}</span>
            <span
              className={cn("w-full max-w-12 rounded-t-lg", p.id === last.id ? "bg-accent" : "bg-accent/35")}
              style={{ height: `${((rank(p.level) + 1) / 6) * 100}%` }}
            />
            <span className="truncate text-[11px] text-subtle">{shortDate(p.completed_at)}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
