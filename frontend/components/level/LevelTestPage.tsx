"use client";

import { ArrowRight, Check, ClipboardCheck, LoaderCircle, Pause, RotateCcw, Target } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, CEFR_LEVELS, LEVEL_NAMES, type CefrLevel, type LevelTest, type LevelTestState } from "@/lib/api";
import type { Teacher } from "@/lib/teachers";
import { cn } from "@/lib/utils";
import { Composer } from "../Composer";
import { TeacherAvatar } from "../TeacherAvatar";
import { useToast } from "../ui/Toast";

type Props = {
  teachers: Teacher[];
  onOpenTeacher: (teacherId: string) => void;
  onCompleted: () => void;
};

type Phase = "intro" | "test" | "result";

const SKILLS = [
  ["grammar", "Grammar"],
  ["vocabulary", "Vocabulary"],
  ["fluency", "Fluency"],
  ["comprehension", "Understanding"],
] as const;

function when(value: string) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(value).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

export function LevelTestPage({ teachers, onOpenTeacher, onCompleted }: Props) {
  const toast = useToast();
  const [state, setState] = useState<LevelTestState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [test, setTest] = useState<LevelTest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .levelTest()
      .then((data) => {
        setState(data);
        setLoadError(null);
      })
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const finished = (done: LevelTest) => {
    setTest(done);
    setState((s) => (s ? { ...s, current: null, latest: done } : s));
    setPhase("result");
    onCompleted();
  };

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      setTest(await api.startLevelTest());
      setPhase("test");
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Couldn't start the test" });
    } finally {
      setBusy(false);
    }
  };

  const resume = (current: LevelTest) => {
    setTest(current);
    setError(null);
    setPhase("test");
  };

  const pause = () => {
    setState((s) => (s && test?.status === "in_progress" ? { ...s, current: test } : s));
    setPhase("intro");
  };

  const answer = async (text: string) => {
    if (!test || busy) return;
    const optimistic: LevelTest = {
      ...test,
      answered: test.answered + 1,
      messages: [...test.messages, { role: "learner", content: text.trim() }],
    };
    setTest(optimistic);
    setBusy(true);
    setError(null);
    try {
      const next = await api.answerLevelTest(test.id, text);
      if (next.status === "completed") finished(next);
      else setTest(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      if (optimistic.answered < test.question_count) setTest(test);
    } finally {
      setBusy(false);
    }
  };

  const retryGrading = async () => {
    if (!test) return;
    setBusy(true);
    setError(null);
    try {
      finished(await api.gradeLevelTest(test.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <Shell>
        <p className="rounded-xl border border-danger/25 bg-danger/6 px-4 py-3 text-sm text-danger">{loadError}</p>
      </Shell>
    );
  }
  if (!state) {
    return (
      <div className="flex flex-1 items-center justify-center text-subtle">
        <LoaderCircle className="size-5 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (phase === "test" && test) {
    return (
      <TestView
        test={test}
        busy={busy}
        error={error}
        onAnswer={(text) => void answer(text)}
        onRetryGrading={() => void retryGrading()}
        onPause={pause}
      />
    );
  }

  if (phase === "result" && (test?.result || state.latest?.result)) {
    const shown = test?.result ? test : state.latest!;
    return (
      <ResultView
        test={shown}
        teachers={teachers}
        onOpenTeacher={onOpenTeacher}
        onRetake={() => void start()}
        retaking={busy}
      />
    );
  }

  return (
    <Intro
      state={state}
      busy={busy}
      onStart={() => void start()}
      onResume={resume}
      onShowResult={() => {
        setTest(state.latest);
        setPhase("result");
      }}
    />
  );
}

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className={cn("mx-auto w-full px-4 py-10 md:px-8", wide ? "max-w-4xl" : "max-w-3xl")}>{children}</div>
    </div>
  );
}

function Intro({
  state,
  busy,
  onStart,
  onResume,
  onShowResult,
}: {
  state: LevelTestState;
  busy: boolean;
  onStart: () => void;
  onResume: (test: LevelTest) => void;
  onShowResult: () => void;
}) {
  const { config, current, latest } = state;
  const steps = [
    { icon: ClipboardCheck, text: `Answer ${config.question_count} short questions, by typing or speaking.` },
    { icon: Target, text: "The questions get harder as you go, so just do your best." },
    { icon: Check, text: "Get your level, a skill breakdown and the best teacher for you." },
  ];

  return (
    <Shell>
      <header className="animate-in">
        <h1 className="text-[28px] leading-tight font-bold tracking-[-0.025em] text-ink md:text-[34px]">Level test</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          A short, friendly chat that finds your English level on the CEFR scale, from A1 to C2. It takes about five
          minutes, and your teachers use the result to pitch their English at the right level for you.
        </p>
      </header>

      {latest?.result && (
        <div className="mt-7 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-5">
          <LevelBadge level={latest.result.level} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">
              Your level: {latest.result.level} · {LEVEL_NAMES[latest.result.level]}
            </p>
            <p className="mt-0.5 text-sm text-muted">Tested {when(latest.completed_at ?? latest.created_at)}</p>
          </div>
          <button
            type="button"
            onClick={onShowResult}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold text-ink transition-colors hover:border-accent/40"
          >
            See result
            <ArrowRight className="size-4" />
          </button>
        </div>
      )}

      {!config.enabled ? (
        <p className="mt-7 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
          The level test is turned off right now. Please check back later.
        </p>
      ) : (
        <>
          <ul className="mt-7 grid gap-3 sm:grid-cols-3">
            {steps.map(({ icon: Icon, text }) => (
              <li key={text} className="rounded-2xl border border-line bg-surface p-4">
                <span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon className="size-[18px]" />
                </span>
                <p className="mt-3 text-sm leading-relaxed text-ink">{text}</p>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {current ? (
              <>
                <button
                  type="button"
                  onClick={() => onResume(current)}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-[15px] font-semibold text-accent-ink transition-opacity hover:opacity-90"
                >
                  Continue test · question {Math.min(current.answered + 1, current.question_count)} of{" "}
                  {current.question_count}
                  <ArrowRight className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={onStart}
                  disabled={busy}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold text-ink transition-colors hover:border-accent/40 disabled:opacity-60"
                >
                  {busy ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                  Start over
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onStart}
                disabled={busy}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-[15px] font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {busy && <LoaderCircle className="size-4 animate-spin" />}
                {latest ? "Retake the test" : "Start the test"}
                {!busy && <ArrowRight className="size-4" />}
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-subtle">
            Don&apos;t worry about mistakes. Nothing is corrected during the test.
          </p>
        </>
      )}
    </Shell>
  );
}

function TestView({
  test,
  busy,
  error,
  onAnswer,
  onRetryGrading,
  onPause,
}: {
  test: LevelTest;
  busy: boolean;
  error: string | null;
  onAnswer: (text: string) => void;
  onRetryGrading: () => void;
  onPause: () => void;
}) {
  const end = useRef<HTMLDivElement>(null);
  const allAnswered = test.answered >= test.question_count;
  const current = Math.min(test.answered + 1, test.question_count);
  const progress = (test.answered / test.question_count) * 100;

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [test.messages.length, busy]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-line/70">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 py-3 md:px-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink">
                {allAnswered ? "All questions answered" : `Question ${current} of ${test.question_count}`}
              </span>
              <span className="text-subtle tabular-nums">{Math.round(progress)}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-hover">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          {!allAnswered && (
            <button
              type="button"
              onClick={onPause}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-muted transition-colors hover:bg-hover hover:text-ink"
            >
              <Pause className="size-3.5" />
              Pause
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 md:px-6">
          {test.messages.map((m, i) =>
            m.role === "examiner" ? (
              <div key={i} className="animate-in flex max-w-[85%] gap-3">
                <ExaminerAvatar />
                <p className="rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-2.5 text-[15px] leading-relaxed text-ink">
                  {m.content}
                </p>
              </div>
            ) : (
              <p
                key={i}
                className="animate-in max-w-[85%] self-end rounded-2xl rounded-tr-md bg-hover px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap text-ink"
              >
                {m.content}
              </p>
            ),
          )}

          {busy && (
            <div className="flex items-center gap-3">
              <ExaminerAvatar />
              {allAnswered ? (
                <span className="flex items-center gap-2 text-sm text-muted">
                  <LoaderCircle className="size-4 animate-spin" />
                  Checking your answers… this takes a few seconds.
                </span>
              ) : (
                <span className="flex gap-1 rounded-2xl border border-line bg-surface px-4 py-3.5" aria-label="Typing">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="size-1.5 animate-bounce rounded-full bg-subtle"
                      style={{ animationDelay: `${d * 120}ms` }}
                    />
                  ))}
                </span>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-danger/25 bg-danger/6 px-4 py-3 text-sm text-danger" role="alert">
              {error}
              {allAnswered && (
                <button
                  type="button"
                  onClick={onRetryGrading}
                  className="ml-2 font-semibold text-ink underline-offset-4 hover:underline"
                >
                  Try again
                </button>
              )}
            </div>
          )}
          <div ref={end} />
        </div>
      </div>

      {!allAnswered && (
        <div className="mx-auto w-full max-w-3xl px-4 pb-3 md:px-6">
          <Composer
            key={test.id}
            onSend={onAnswer}
            onStop={() => {}}
            isStreaming={busy}
            autoFocus
            placeholder="Type or speak your answer…"
            hint="Answer in your own words. Nothing is corrected during the test."
          />
        </div>
      )}
    </div>
  );
}

function ExaminerAvatar() {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-bg">
      <ClipboardCheck className="size-4" />
    </span>
  );
}

function LevelBadge({ level, large }: { level: CefrLevel; large?: boolean }) {
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

function LevelScale({ level }: { level: CefrLevel }) {
  const index = CEFR_LEVELS.indexOf(level);
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

function ResultView({
  test,
  teachers,
  onOpenTeacher,
  onRetake,
  retaking,
}: {
  test: LevelTest;
  teachers: Teacher[];
  onOpenTeacher: (id: string) => void;
  onRetake: () => void;
  retaking: boolean;
}) {
  const result = test.result!;
  const teacher = teachers.find((t) => t.id === result.recommended_teacher_id);

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
            <p className="mt-1 text-sm text-muted">
              CEFR {result.level} · tested {when(test.completed_at ?? test.created_at)}
            </p>
          </div>
        </div>
        <div className="mt-6">
          <LevelScale level={result.level} />
        </div>
        <p className="mt-6 text-[15px] leading-relaxed text-ink">{result.summary}</p>
      </section>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-[15px] font-semibold text-ink">Skills</h2>
          <ul className="mt-4 space-y-3.5">
            {SKILLS.map(([key, label]) => {
              const level = result.scores[key];
              const index = CEFR_LEVELS.indexOf(level);
              return (
                <li key={key}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">{label}</span>
                    <span className="font-semibold text-ink">{level}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-hover">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${((index + 1) / 6) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
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
        </section>
      </div>

      {teacher && (
        <section
          className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-5"
          style={{ borderColor: `color-mix(in srgb, ${teacher.color} 30%, var(--line))` }}
        >
          <TeacherAvatar name={teacher.name} color={teacher.color} size={48} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wider text-subtle uppercase">Recommended for you</p>
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
        <button
          type="button"
          onClick={onRetake}
          disabled={retaking}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold text-ink transition-colors hover:border-accent/40 disabled:opacity-60"
        >
          {retaking ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
          Retake the test
        </button>
      </div>
    </Shell>
  );
}
