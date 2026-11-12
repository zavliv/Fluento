"use client";

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  ClipboardCheck,
  ListChecks,
  LoaderCircle,
  MessagesSquare,
  Mic,
  Pause,
  RotateCcw,
  Target,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  api,
  CEFR_LEVELS,
  LEVEL_NAMES,
  type CefrLevel,
  type LevelHistoryItem,
  type LevelTest,
  type LevelTestState,
  type QuizQuestion,
} from "@/lib/api";
import type { Teacher } from "@/lib/teachers";
import { cn } from "@/lib/utils";
import { Composer } from "../Composer";
import { TeacherAvatar } from "../TeacherAvatar";
import { useToast } from "../ui/Toast";

type Props = {
  teachers: Teacher[];
  onOpenTeacher: (teacherId: string) => void;
  onPractise: (teacherId: string, text: string) => void;
  onCompleted: () => void;
};

type Phase = "intro" | "test" | "result";

const SKILLS = [
  ["grammar", "Grammar"],
  ["vocabulary", "Vocabulary"],
  ["fluency", "Fluency"],
  ["comprehension", "Understanding"],
] as const;

const OPTION_KEYS = ["A", "B", "C", "D"];

function when(value: string) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return shortDate(value);
}

function shortDate(value: string) {
  return new Date(value).toLocaleDateString([], { day: "numeric", month: "short" });
}

const rank = (level: CefrLevel) => CEFR_LEVELS.indexOf(level);

export function LevelTestPage({ teachers, onOpenTeacher, onPractise, onCompleted }: Props) {
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
    setPhase("result");
    load();
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

  const run = async (action: () => Promise<LevelTest>, rollback?: LevelTest) => {
    setBusy(true);
    setError(null);
    try {
      const next = await action();
      if (next.status === "completed") finished(next);
      else setTest(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      if (rollback) setTest(rollback);
    } finally {
      setBusy(false);
    }
  };

  const answerQuiz = (choice: number) => {
    if (!test || busy) return;
    void run(() => api.answerLevelQuiz(test.id, choice));
  };

  const answerChat = (text: string, voice: boolean) => {
    if (!test || busy) return;
    const before = test;
    const optimistic: LevelTest = {
      ...test,
      answered: test.answered + 1,
      messages: [...test.messages, { role: "learner", content: text.trim(), mode: voice ? "voice" : "typed" }],
    };
    setTest(optimistic);
    const last = optimistic.answered >= test.question_count;
    void run(() => api.answerLevelTest(test.id, text, voice ? "voice" : "typed"), last ? undefined : before);
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
    return test.phase === "quiz" && test.quiz?.current ? (
      <QuizView test={test} busy={busy} error={error} onChoose={answerQuiz} onPause={() => pause()} />
    ) : (
      <ChatView
        test={test}
        busy={busy}
        error={error}
        onAnswer={answerChat}
        onRetryGrading={() => void run(() => api.gradeLevelTest(test.id))}
        onPause={() => pause()}
      />
    );
  }

  const shown = phase === "result" ? (test?.result ? test : state.latest) : null;
  if (shown?.result) {
    return (
      <ResultView
        test={shown}
        history={state.history}
        teachers={teachers}
        onOpenTeacher={onOpenTeacher}
        onPractise={onPractise}
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
      onResume={(current) => {
        setTest(current);
        setError(null);
        setPhase("test");
      }}
      onShowResult={() => {
        setTest(state.latest);
        setPhase("result");
      }}
    />
  );

  function pause() {
    setState((s) => (s && test?.status === "in_progress" ? { ...s, current: test } : s));
    setPhase("intro");
  }
}

function Shell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className={cn("mx-auto w-full px-4 py-10 md:px-8", wide ? "max-w-4xl" : "max-w-3xl")}>{children}</div>
    </div>
  );
}

function Panel({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-surface p-5", className)}>
      {title && <h2 className="mb-3 text-[15px] font-semibold text-ink">{title}</h2>}
      {children}
    </section>
  );
}

// Intro

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
  const { config, current, latest, history } = state;
  const minutes = Math.max(3, Math.round((config.quiz_enabled ? config.quiz_count * 0.3 : 0) + config.question_count));
  const parts = [
    ...(config.quiz_enabled
      ? [
          {
            icon: ListChecks,
            title: "Quick check",
            text: `${config.quiz_count} multiple-choice grammar and vocabulary questions. They adapt to you: get one right and the next is harder.`,
          },
        ]
      : []),
    {
      icon: MessagesSquare,
      title: "Conversation",
      text: `${config.question_count} short questions to answer in your own words. Type, or tap the mic and speak.`,
    },
    {
      icon: Target,
      title: "Your results",
      text: "Your CEFR level, skill scores, feedback on every answer and a study plan with the right teachers.",
    },
  ];

  const progress = current
    ? current.phase === "quiz" && current.quiz
      ? `quick check, question ${current.quiz.answered + 1} of ${current.quiz.total}`
      : `conversation, question ${Math.min(current.answered + 1, current.question_count)} of ${current.question_count}`
    : "";

  return (
    <Shell>
      <header className="animate-in">
        <h1 className="text-[28px] leading-tight font-bold tracking-[-0.025em] text-ink md:text-[34px]">Level test</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          Find your English level on the CEFR scale, from A1 to C2, in about {minutes} minutes. Your teachers use the
          result to pitch their English at the right level for you.
        </p>
      </header>

      {latest?.result && (
        <div className="mt-7 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-5">
          <LevelBadge level={latest.result.level} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">
              Your level: {latest.result.level} · {LEVEL_NAMES[latest.result.level]}
            </p>
            <p className="mt-0.5 text-sm text-muted">
              Tested {when(latest.completed_at ?? latest.created_at)}
              {history.length > 1 && ` · ${history.length} tests taken`}
            </p>
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
          <ol className={cn("mt-7 grid gap-3", parts.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
            {parts.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="text-xs font-semibold tracking-wider text-subtle uppercase">
                    {i < parts.length - 1 ? `Part ${i + 1}` : "Then"}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {current ? (
              <>
                <PrimaryButton onClick={() => onResume(current)}>
                  Continue · {progress}
                  <ArrowRight className="size-4" />
                </PrimaryButton>
                <SecondaryButton onClick={onStart} disabled={busy}>
                  {busy ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                  Start over
                </SecondaryButton>
              </>
            ) : (
              <PrimaryButton onClick={onStart} disabled={busy}>
                {busy && <LoaderCircle className="size-4 animate-spin" />}
                {latest ? "Retake the test" : "Start the test"}
                {!busy && <ArrowRight className="size-4" />}
              </PrimaryButton>
            )}
          </div>
          <p className="mt-3 text-xs text-subtle">
            Don&apos;t worry about mistakes, and don&apos;t look anything up. Nothing is corrected during the test.
          </p>
        </>
      )}
    </Shell>
  );
}

function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-[15px] font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-60"
    />
  );
}

function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="inline-flex h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold text-ink transition-colors hover:border-accent/40 disabled:opacity-60"
    />
  );
}

// Test header

function TestHeader({
  part,
  label,
  done,
  total,
  onPause,
}: {
  part: string | null;
  label: string;
  done: number;
  total: number;
  onPause?: () => void;
}) {
  const progress = total ? (done / total) * 100 : 0;
  return (
    <div className="border-b border-line/70">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 py-3 md:px-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="truncate font-semibold text-ink">
              {part && <span className="font-normal text-subtle">{part} · </span>}
              {label}
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
        {onPause && (
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
  );
}

// Quick check

function QuizView({
  test,
  busy,
  error,
  onChoose,
  onPause,
}: {
  test: LevelTest;
  busy: boolean;
  error: string | null;
  onChoose: (choice: number) => void;
  onPause: () => void;
}) {
  const quiz = test.quiz!;
  const question = quiz.current!;
  const [chosen, setChosen] = useState<{ id: string; index: number } | null>(null);
  const picked = chosen?.id === question.id ? chosen.index : null;

  const choose = useCallback(
    (index: number) => {
      if (busy) return;
      setChosen({ id: question.id, index });
      onChoose(index);
    },
    [busy, question.id, onChoose],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toUpperCase();
      const index = OPTION_KEYS.indexOf(key) >= 0 ? OPTION_KEYS.indexOf(key) : ["1", "2", "3", "4"].indexOf(key);
      if (index >= 0) {
        e.preventDefault();
        choose(index);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TestHeader
        part="Part 1 of 2"
        label={`Quick check · question ${quiz.answered + 1} of ${quiz.total}`}
        done={quiz.answered}
        total={quiz.total}
        onPause={onPause}
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div key={question.id} className="animate-in mx-auto w-full max-w-2xl px-4 py-10 md:px-6">
          <p className="text-xs font-semibold tracking-wider text-subtle uppercase">
            {question.skill === "grammar" ? "Grammar" : "Vocabulary"} · choose the best answer
          </p>
          <QuizSentence question={question} filled={picked === null ? null : question.options[picked]} />
          <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
            {question.options.map((option, i) => (
              <button
                key={option}
                type="button"
                disabled={busy}
                onClick={() => choose(i)}
                className={cn(
                  "flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] transition-all",
                  picked === i
                    ? "border-accent bg-accent-soft font-semibold text-ink"
                    : "border-line bg-surface text-ink hover:border-accent/50 disabled:opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold",
                    picked === i ? "bg-accent text-accent-ink" : "bg-hover text-muted",
                  )}
                >
                  {picked === i && busy ? <LoaderCircle className="size-3.5 animate-spin" /> : OPTION_KEYS[i]}
                </span>
                {option}
              </button>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-subtle">
            Press <kbd className="kbd">A</kbd>–<kbd className="kbd">D</kbd> or <kbd className="kbd">1</kbd>–
            <kbd className="kbd">4</kbd> to answer. If you don&apos;t know, take your best guess.
          </p>
          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-danger/25 bg-danger/6 px-4 py-3 text-sm text-danger"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function QuizSentence({ question, filled }: { question: QuizQuestion; filled: string | null }) {
  const [before, ...rest] = question.question.split("___");
  return (
    <p className="mt-3 text-[22px] leading-relaxed font-semibold tracking-[-0.01em] text-ink md:text-[26px]">
      {before}
      <span
        className={cn(
          "mx-1 inline-block min-w-24 border-b-2 px-1 text-center",
          filled ? "border-accent text-accent" : "border-subtle text-transparent",
        )}
      >
        {filled ?? "…"}
      </span>
      {rest.join("___")}
    </p>
  );
}

// Conversation

function ChatView({
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
  onAnswer: (text: string, voice: boolean) => void;
  onRetryGrading: () => void;
  onPause: () => void;
}) {
  const end = useRef<HTMLDivElement>(null);
  const allAnswered = test.answered >= test.question_count;
  const current = Math.min(test.answered + 1, test.question_count);
  const hasQuiz = Boolean(test.quiz);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [test.messages.length, busy]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TestHeader
        part={hasQuiz ? "Part 2 of 2" : null}
        label={allAnswered ? "All questions answered" : `Conversation · question ${current} of ${test.question_count}`}
        done={test.answered}
        total={test.question_count}
        onPause={allAnswered ? undefined : onPause}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 md:px-6">
          {hasQuiz && test.answered === 0 && (
            <p className="animate-in rounded-xl bg-hover px-4 py-3 text-center text-sm text-muted">
              Quick check done. Now a short conversation: answer in your own words, by typing or with the mic.
            </p>
          )}
          {test.messages.map((m, i) =>
            m.role === "examiner" ? (
              <div key={i} className="animate-in flex max-w-[85%] gap-3">
                <ExaminerAvatar />
                <p className="rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-2.5 text-[15px] leading-relaxed text-ink">
                  {m.content}
                </p>
              </div>
            ) : (
              <div key={i} className="animate-in flex max-w-[85%] flex-col items-end self-end">
                <p className="rounded-2xl rounded-tr-md bg-hover px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap text-ink">
                  {m.content}
                </p>
                {m.mode === "voice" && (
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-subtle">
                    <Mic className="size-3" />
                    Spoken
                  </span>
                )}
              </div>
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
            onSend={(text, meta) => onAnswer(text, meta.voice)}
            onStop={() => {}}
            isStreaming={busy}
            autoFocus
            placeholder="Type or speak your answer…"
            hint="Answer in your own words. Speaking counts too: tap the mic."
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

// Results

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

function ResultView({
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
                        · you chose <span className="text-danger line-through">{q.options[q.chosen]}</span>
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
        <SecondaryButton onClick={onRetake} disabled={retaking}>
          {retaking ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
          Retake the test
        </SecondaryButton>
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
