"use client";

import { ArrowDown, ArrowRight, ArrowUp, Check, Mic, RotateCcw, Share2, Target, X } from "lucide-react";
import { useState } from "react";
import { LEVEL_NAMES, type CefrLevel, type LevelHistoryItem, type LevelTest } from "@/lib/api";
import type { Teacher } from "@/lib/teachers";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "../SiteSettings";
import { TeacherAvatar } from "../TeacherAvatar";
import { useToast } from "../ui/Toast";
import { FocusBar, LevelBadge, PrimaryButton, SecondaryButton, SkillBar, rank, shortDate, when } from "./shared";

type Tab = "overview" | "answers" | "plan";

const SKILLS = [
  ["grammar", "Grammar"],
  ["vocabulary", "Vocabulary"],
  ["fluency", "Fluency"],
  ["comprehension", "Understanding"],
] as const;

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

function Change({ from, to, long }: { from: CefrLevel; to: CefrLevel; long?: boolean }) {
  const diff = rank(to) - rank(from);
  if (diff === 0) return long ? <span className="text-muted">Same as last time</span> : null;
  const up = diff > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-semibold",
        up ? "text-success" : "text-danger",
        !long && "text-xs",
      )}
    >
      {up ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
      {long ? `${up ? "Up" : "Down"} from ${from} since last time` : from}
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
  onClose,
}: {
  test: LevelTest;
  history: LevelHistoryItem[];
  teachers: Teacher[];
  onOpenTeacher: (id: string) => void;
  onPractise: (teacherId: string, text: string) => void;
  onRetake: () => void;
  onClose: () => void;
}) {
  const result = test.result!;
  const toast = useToast();
  const { app_name } = useSiteSettings();
  const [tab, setTab] = useState<Tab>("overview");
  const byId = Object.fromEntries(teachers.map((t) => [t.id, t]));
  const teacher = result.recommended_teacher_id ? byId[result.recommended_teacher_id] : undefined;
  const finishedAt = test.completed_at ?? test.created_at;
  const previous = [...history]
    .filter((h) => h.id !== test.id && new Date(h.completed_at) < new Date(finishedAt))
    .pop();

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
        ? "Copied. Paste it anywhere to share your result."
        : "Couldn't copy. Try again.",
    });
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "answers", label: "Your answers" },
    ...(result.plan.length ? [{ id: "plan" as const, label: "Study plan" }] : []),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FocusBar
        onClose={onClose}
        closeLabel="Close results"
        right={
          <button
            type="button"
            onClick={() => void share()}
            className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted transition-colors hover:bg-hover hover:text-ink"
          >
            <Share2 className="size-4" />
            Share
          </button>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-5 pt-4 pb-12">
          <section className="animate-in rounded-3xl border border-line bg-surface p-6 md:p-7">
            <div className="flex items-center gap-5">
              <LevelBadge level={result.level} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-muted">Your English level</p>
                <h1 className="mt-0.5 text-[26px] leading-tight font-bold tracking-[-0.025em] text-ink">
                  {LEVEL_NAMES[result.level]}
                </h1>
                <p className="mt-1 text-sm">
                  {previous ? (
                    <Change from={previous.level} to={result.level} long />
                  ) : (
                    <span className="text-muted">Tested {when(finishedAt)}</span>
                  )}
                </p>
              </div>
            </div>
            <p className="mt-5 text-[15px] leading-relaxed text-ink">{result.summary}</p>
          </section>

          <div role="tablist" className="mt-6 flex gap-6 border-b border-line">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "-mb-px border-b-2 pb-3 text-sm transition-colors",
                  tab === t.id
                    ? "border-accent font-semibold text-ink"
                    : "border-transparent text-muted hover:text-ink",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div key={tab} className="animate-in pt-6">
            {tab === "overview" && (
              <div className="space-y-6">
                <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {SKILLS.map(([key, label]) => (
                    <SkillBar
                      key={key}
                      label={label}
                      level={result.scores[key]}
                      change={previous && <Change from={previous.scores[key]} to={result.scores[key]} />}
                    />
                  ))}
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <List title="What you do well" items={result.strengths} icon="check" />
                  <List title="Work on next" items={result.improvements} icon="target" />
                </div>

                {teacher && (
                  <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4">
                    <TeacherAvatar name={teacher.name} color={teacher.color} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-ink">Practise with {teacher.name}</p>
                      <p className="text-sm text-muted">{result.recommendation_reason || teacher.specialty}</p>
                    </div>
                    <PrimaryButton onClick={() => onOpenTeacher(teacher.id)} className="h-10 px-5 text-sm">
                      Start
                      <ArrowRight className="size-4" />
                    </PrimaryButton>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 text-xs text-muted">
                  {result.quiz_total != null && (
                    <span className="rounded-full bg-hover px-3 py-1">
                      Warm-up: {result.quiz_correct} of {result.quiz_total} right
                    </span>
                  )}
                  <span className="rounded-full bg-hover px-3 py-1">
                    Chat: {test.messages.filter((m) => m.role === "learner").length} answers
                    {test.topic && ` about ${test.topic.toLowerCase()}`}
                  </span>
                </div>

                {history.length > 1 && <Progress history={history} />}
              </div>
            )}

            {tab === "answers" && <Answers test={test} />}

            {tab === "plan" && (
              <ol className="space-y-3">
                {result.plan.map((step, i) => {
                  const t = step.teacher_id ? byId[step.teacher_id] : undefined;
                  return (
                    <li key={step.title} className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-ink">{step.title}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-muted">{step.detail}</p>
                        {t && (
                          <button
                            type="button"
                            onClick={() =>
                              onPractise(t.id, step.practice_prompt || `Can we practise this: ${step.title}?`)
                            }
                            className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl border border-line pr-3 pl-1.5 text-sm font-semibold whitespace-nowrap text-ink transition-colors hover:border-accent/40"
                          >
                            <TeacherAvatar name={t.name} color={t.color} size={24} />
                            Practise with {t.name}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <SecondaryButton onClick={onRetake}>
              <RotateCcw className="size-4" />
              Retake the test
            </SecondaryButton>
            <SecondaryButton onClick={onClose}>Back to teachers</SecondaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function List({ title, items, icon }: { title: string; items: string[]; icon: "check" | "target" }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <ul className="mt-2.5 space-y-2">
        {items.map((s) => (
          <li key={s} className="flex gap-2 text-sm leading-relaxed text-ink">
            {icon === "check" ? (
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
            ) : (
              <Target className="mt-0.5 size-4 shrink-0 text-accent" />
            )}
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Answers({ test }: { test: LevelTest }) {
  const feedback = test.result?.answer_feedback ?? [];
  const answers = test.messages.filter((m) => m.role === "learner");
  const questions = test.messages.filter((m) => m.role === "examiner");
  const quiz = test.quiz_review;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-ink">Chat</h2>
        <p className="text-xs text-muted">How each answer could sound one step higher.</p>
        <ol className="mt-3 space-y-3">
          {answers.map((answer, i) => {
            const f = feedback[i];
            return (
              <li key={i} className="rounded-2xl border border-line bg-surface p-4">
                <p className="text-xs text-muted">{questions[i]?.content}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink">
                  {answer.content}
                  {answer.mode === "voice" && (
                    <Mic className="ml-1.5 inline size-3.5 text-subtle" aria-label="Spoken" />
                  )}
                </p>
                {f?.improved && f.improved !== answer.content && (
                  <p className="mt-2 rounded-xl bg-success/8 px-3 py-2 text-[15px] leading-relaxed text-ink">
                    <span className="mr-1.5 text-xs font-bold text-success">Better</span>
                    {f.improved}
                  </p>
                )}
                {f?.tip && <p className="mt-2 text-sm text-muted">{f.tip}</p>}
              </li>
            );
          })}
        </ol>
      </section>

      {quiz.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-ink">Warm-up</h2>
          <p className="text-xs text-muted">
            {quiz.filter((q) => q.correct).length} of {quiz.length} right
          </p>
          <ol className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
            {quiz.map((q, i) => (
              <li key={i} className="flex gap-3 px-4 py-3">
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
                  <p className="mt-0.5 text-xs text-muted">
                    {q.level} {q.skill}
                    {!q.correct &&
                      (q.format === "judge"
                        ? ` · you said “${q.options[q.shown ?? q.answer_index]}” ${q.chosen === 0 ? "sounded right" : "sounded wrong"}`
                        : ` · you chose “${q.options[q.chosen]}”`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function Progress({ history }: { history: LevelHistoryItem[] }) {
  const points = history.slice(-8);
  const last = points[points.length - 1];
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm font-semibold text-ink">Your progress</p>
      <div className="mt-4 flex h-28 items-end gap-2">
        {points.map((p) => (
          <div key={p.id} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-xs font-semibold text-ink">{p.level}</span>
            <span
              className={cn("w-full max-w-10 rounded-t-lg", p.id === last.id ? "bg-accent" : "bg-accent/30")}
              style={{ height: `${((rank(p.level) + 1) / 6) * 100}%` }}
            />
            <span className="truncate text-[11px] text-subtle">{shortDate(p.completed_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
