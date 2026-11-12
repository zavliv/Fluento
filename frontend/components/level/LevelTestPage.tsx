"use client";

import { ArrowRight, Check, LoaderCircle, Mic, RotateCcw, Shuffle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, CEFR_LEVELS, LEVEL_NAMES, type CefrLevel, type LevelTest, type LevelTestState } from "@/lib/api";
import type { Teacher } from "@/lib/teachers";
import { cn } from "@/lib/utils";
import { Composer } from "../Composer";
import { useToast } from "../ui/Toast";
import { ResultView } from "./Results";
import { ExaminerAvatar, LevelBadge, PrimaryButton, SecondaryButton, Shell, when } from "./shared";
import { JourneyBar, WarmUp } from "./WarmUp";

type Props = {
  teachers: Teacher[];
  onOpenTeacher: (teacherId: string) => void;
  onPractise: (teacherId: string, text: string) => void;
  onCompleted: () => void;
};

type Phase = "intro" | "topic" | "test" | "interlude" | "reveal" | "result";

const TOPIC_EMOJI: Record<string, string> = {
  travel: "✈️",
  food: "🍜",
  "movies & music": "🎬",
  "work & study": "💼",
  sports: "⚽",
  technology: "💡",
  "family & friends": "👨‍👩‍👧",
  nature: "🌿",
};

const GRADING_LINES = [
  "Reading your answers…",
  "Checking grammar and vocabulary…",
  "Listening for fluency…",
  "Finding your best teacher…",
  "Almost there…",
];

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
    setPhase("reveal");
    load();
    onCompleted();
  };

  const start = async (topic: string) => {
    setBusy(true);
    try {
      const created = await api.startLevelTest(topic);
      setTest(created);
      setError(null);
      setPhase("test");
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Couldn't start the test" });
    } finally {
      setBusy(false);
    }
  };

  const advanceWarmUp = (next: LevelTest) => {
    setTest(next);
    if (next.phase !== "quiz") setPhase("interlude");
  };

  const answerChat = async (text: string, voice: boolean) => {
    if (!test || busy) return;
    const before = test;
    const optimistic: LevelTest = {
      ...test,
      answered: test.answered + 1,
      messages: [...test.messages, { role: "learner", content: text.trim(), mode: voice ? "voice" : "typed" }],
    };
    const last = optimistic.answered >= test.question_count;
    setTest(optimistic);
    setBusy(true);
    setError(null);
    try {
      const next = await api.answerLevelTest(test.id, text, voice ? "voice" : "typed");
      if (next.status === "completed") finished(next);
      else setTest(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      if (!last) setTest(before);
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

  const pause = () => {
    setState((s) => (s && test?.status === "in_progress" ? { ...s, current: test } : s));
    setPhase("intro");
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

  if (phase === "topic") {
    return (
      <TopicPicker
        topics={state.config.topics}
        busy={busy}
        onPick={(topic) => void start(topic)}
        onBack={() => setPhase("intro")}
      />
    );
  }

  if (phase === "test" && test?.phase === "quiz" && test.quiz?.current) {
    return (
      <WarmUp
        test={test}
        onAnswer={(choice) => api.answerLevelQuiz(test.id, choice)}
        onAdvance={advanceWarmUp}
        onPause={pause}
      />
    );
  }

  if (phase === "interlude" && test) {
    return <Interlude test={test} onContinue={() => setPhase("test")} />;
  }

  if ((phase === "test" || phase === "interlude") && test) {
    return (
      <ChatRound
        test={test}
        busy={busy}
        error={error}
        onAnswer={(text, voice) => void answerChat(text, voice)}
        onRetryGrading={() => void retryGrading()}
        onPause={pause}
      />
    );
  }

  if (phase === "reveal" && test?.result) {
    return <Reveal level={test.result.level} onDone={() => setPhase("result")} />;
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
        onRetake={() => setPhase("topic")}
        retaking={busy}
      />
    );
  }

  return (
    <Intro
      state={state}
      onStart={() => setPhase("topic")}
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
}

// Intro

function Intro({
  state,
  onStart,
  onResume,
  onShowResult,
}: {
  state: LevelTestState;
  onStart: () => void;
  onResume: (test: LevelTest) => void;
  onShowResult: () => void;
}) {
  const { config, current, latest } = state;
  const minutes = Math.max(
    3,
    Math.round((config.quiz_enabled ? config.quiz_count * 0.25 : 0) + config.question_count * 0.8),
  );
  const stops = [
    ...(config.quiz_enabled ? [{ title: "Warm-up", text: `${config.quiz_count} quick rounds` }] : []),
    { title: "Chat", text: `${config.question_count} questions on a topic you pick` },
    { title: "Your level", text: "Plus your perfect teacher" },
  ];

  return (
    <Shell>
      <div className="animate-in rounded-3xl border border-line bg-surface px-6 py-10 text-center md:px-12 md:py-14">
        <p className="text-sm font-semibold text-accent">About {minutes} minutes · no pressure</p>
        <h1 className="mx-auto mt-3 max-w-lg text-[34px] leading-[1.1] font-bold tracking-[-0.03em] text-ink md:text-[44px]">
          How good is your English, really?
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted">
          Play a few quick rounds, then chat about something you love. We&apos;ll find your level from A1 to C2.
        </p>

        <ol className="mx-auto mt-9 flex max-w-xl items-start justify-center">
          {stops.map((stop, i) => (
            <li key={stop.title} className="relative flex flex-1 flex-col items-center px-2">
              {i > 0 && <span className="absolute top-4 right-1/2 -left-1/2 h-0.5 bg-line" aria-hidden />}
              <span className="relative z-10 flex size-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-ink ring-4 ring-surface">
                {i + 1}
              </span>
              <span className="mt-2 text-sm font-semibold text-ink">{stop.title}</span>
              <span className="mt-0.5 text-xs leading-snug text-muted">{stop.text}</span>
            </li>
          ))}
        </ol>

        {!config.enabled ? (
          <p className="mx-auto mt-9 max-w-sm rounded-xl bg-hover px-4 py-3 text-sm text-muted">
            The level test is turned off right now. Please check back later.
          </p>
        ) : (
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            {current ? (
              <>
                <PrimaryButton onClick={() => onResume(current)}>
                  Continue where you left off
                  <ArrowRight className="size-4" />
                </PrimaryButton>
                <SecondaryButton onClick={onStart}>
                  <RotateCcw className="size-4" />
                  Start over
                </SecondaryButton>
              </>
            ) : (
              <PrimaryButton onClick={onStart}>
                {latest ? "Play again" : "Let's go"}
                <ArrowRight className="size-4" />
              </PrimaryButton>
            )}
          </div>
        )}
      </div>

      {latest?.result && (
        <button
          type="button"
          onClick={onShowResult}
          className="mt-4 flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-accent/40"
        >
          <LevelBadge level={latest.result.level} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">
              Last result: {latest.result.level} · {LEVEL_NAMES[latest.result.level]}
            </span>
            <span className="block text-sm text-muted">Tested {when(latest.completed_at ?? latest.created_at)}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-ink">
            See result
            <ArrowRight className="size-4" />
          </span>
        </button>
      )}
    </Shell>
  );
}

// Topic

function TopicPicker({
  topics,
  busy,
  onPick,
  onBack,
}: {
  topics: string[];
  busy: boolean;
  onPick: (topic: string) => void;
  onBack: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const pick = (topic: string) => {
    if (busy) return;
    setPicked(topic);
    onPick(topic);
  };

  return (
    <Shell>
      <div className="animate-in text-center">
        <p className="text-sm font-semibold text-accent">Before we start</p>
        <h1 className="mt-2 text-[28px] leading-tight font-bold tracking-[-0.025em] text-ink md:text-[34px]">
          What do you love talking about?
        </h1>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-muted">
          Pick a topic. The chat part of your test will be all about it.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {topics.map((topic, i) => {
          const chosen = picked === topic;
          return (
            <button
              key={topic}
              type="button"
              onClick={() => pick(topic)}
              disabled={busy}
              style={{ animationDelay: `${i * 40}ms` }}
              className={cn(
                "animate-in flex h-28 flex-col items-center justify-center gap-2 rounded-2xl border bg-surface px-3 text-center transition-all",
                chosen
                  ? "border-accent bg-accent-soft"
                  : "border-line hover:-translate-y-0.5 hover:border-accent/50 disabled:opacity-50",
              )}
            >
              <span className="text-[28px] leading-none" aria-hidden>
                {chosen && busy ? (
                  <LoaderCircle className="size-7 animate-spin text-accent" />
                ) : (
                  (TOPIC_EMOJI[topic.toLowerCase()] ?? "💬")
                )}
              </span>
              <span className="text-sm font-semibold text-ink">{topic}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <SecondaryButton onClick={onBack} disabled={busy}>
          Back
        </SecondaryButton>
        <SecondaryButton
          onClick={() => topics.length && pick(topics[Math.floor(Math.random() * topics.length)])}
          disabled={busy || topics.length === 0}
        >
          <Shuffle className="size-4" />
          Surprise me
        </SecondaryButton>
      </div>
    </Shell>
  );
}

// Interlude

function Interlude({ test, onContinue }: { test: LevelTest; onContinue: () => void }) {
  const quiz = test.quiz;
  const score = quiz ? quiz.correct / Math.max(1, quiz.total) : 0;
  const title = score >= 0.85 ? "Impressive!" : score >= 0.6 ? "Great warm-up!" : "Warm-up done!";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") onContinue();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onContinue]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <JourneyBar
        stage="chat"
        warm={quiz ? { done: quiz.total, total: quiz.total } : null}
        chat={{ done: 0, total: test.question_count }}
      />
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-10">
        <div className="animate-in w-full max-w-md text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/12 text-success">
            <Check className="size-8" strokeWidth={2.5} />
          </span>
          <h1 className="mt-5 text-[30px] leading-tight font-bold tracking-[-0.025em] text-ink">{title}</h1>
          {quiz && (
            <p className="mt-2 text-[15px] text-muted">
              You got{" "}
              <span className="font-semibold text-ink">
                {quiz.correct} of {quiz.total}
              </span>{" "}
              and reached <span className="font-semibold text-ink">{quiz.climb}</span> on the difficulty ladder.
            </p>
          )}
          <div className="mt-7 rounded-2xl border border-line bg-surface p-5 text-left">
            <p className="text-xs font-semibold tracking-wider text-subtle uppercase">Next up · Chat</p>
            <p className="mt-2 text-sm leading-relaxed text-ink">
              {test.question_count} friendly questions. Answer in your own words, there are no wrong answers here.
            </p>
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <Mic className="size-4 text-accent" />
              Try speaking your answers: it&apos;s great practice and it counts.
            </p>
          </div>
          <PrimaryButton onClick={onContinue} className="mt-7">
            Let&apos;s chat
            <ArrowRight className="size-4" />
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

// Chat

function ChatRound({
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
  const [line, setLine] = useState(0);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [test.messages.length, busy]);

  useEffect(() => {
    if (!(busy && allAnswered)) return;
    const timer = window.setInterval(() => setLine((l) => Math.min(l + 1, GRADING_LINES.length - 1)), 1800);
    return () => {
      window.clearInterval(timer);
      setLine(0);
    };
  }, [busy, allAnswered]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <JourneyBar
        stage="chat"
        warm={test.quiz ? { done: test.quiz.total, total: test.quiz.total } : null}
        chat={{ done: test.answered, total: test.question_count }}
        onPause={allAnswered ? undefined : onPause}
      />

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
                <span key={line} className="animate-in flex items-center gap-2 text-sm text-muted">
                  <LoaderCircle className="size-4 animate-spin" />
                  {GRADING_LINES[line]}
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
          <div className="mb-2 flex justify-center gap-1.5" aria-hidden>
            {Array.from({ length: test.question_count }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i < test.answered ? "w-5 bg-accent" : i === test.answered ? "w-5 bg-ink" : "w-1.5 bg-line",
                )}
              />
            ))}
          </div>
          <Composer
            key={test.id}
            onSend={(text, meta) => onAnswer(text, meta.voice)}
            onStop={() => {}}
            isStreaming={busy}
            autoFocus
            placeholder="Type or speak your answer…"
            hint="No wrong answers here. Speaking counts too: tap the mic."
            stoppable={false}
          />
        </div>
      )}
    </div>
  );
}

// Reveal

const CONFETTI_COLORS = ["#0d9488", "#f59e0b", "#e11d48", "#6366f1", "#22c55e", "#0ea5e9"];

function Confetti() {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = box.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const pieces: HTMLSpanElement[] = [];
    for (let i = 0; i < 90; i++) {
      const piece = document.createElement("span");
      const size = 6 + Math.random() * 6;
      Object.assign(piece.style, {
        position: "absolute",
        top: "-20px",
        left: `${Math.random() * 100}%`,
        width: `${size}px`,
        height: `${size * (Math.random() > 0.5 ? 0.45 : 1)}px`,
        background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        borderRadius: Math.random() > 0.6 ? "999px" : "2px",
      });
      root.appendChild(piece);
      pieces.push(piece);
      const drift = (Math.random() - 0.5) * 240;
      piece.animate(
        [
          { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
          {
            transform: `translate(${drift}px, ${root.clientHeight + 40}px) rotate(${720 * Math.random()}deg)`,
            opacity: 0.9,
          },
        ],
        {
          duration: 2200 + Math.random() * 1800,
          delay: Math.random() * 500,
          easing: "cubic-bezier(.2,.6,.4,1)",
          fill: "forwards",
        },
      );
    }
    return () => pieces.forEach((p) => p.remove());
  }, []);
  return <div ref={box} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden />;
}

function Reveal({ level, onDone }: { level: CefrLevel; onDone: () => void }) {
  const target = CEFR_LEVELS.indexOf(level);
  const [step, setStep] = useState(0);
  const landed = step >= target;

  useEffect(() => {
    if (landed) return;
    const timer = window.setTimeout(() => setStep((s) => s + 1), 420);
    return () => window.clearTimeout(timer);
  }, [step, landed]);

  const shownLevel = CEFR_LEVELS[Math.min(step, target)];

  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4">
      {landed && <Confetti />}
      <div className="relative w-full max-w-md text-center">
        <p className="text-sm font-semibold tracking-wider text-subtle uppercase">
          {landed ? "Your English level" : "Climbing…"}
        </p>
        <div
          key={shownLevel}
          className={cn(
            "animate-in mx-auto mt-5 flex size-32 items-center justify-center rounded-[32px] text-[52px] font-bold tracking-[-0.03em] transition-colors",
            landed ? "bg-accent text-accent-ink shadow-lg" : "bg-hover text-ink",
          )}
        >
          {shownLevel}
        </div>
        <div className="mx-auto mt-6 flex max-w-xs gap-1">
          {CEFR_LEVELS.map((l, i) => (
            <span
              key={l}
              className={cn(
                "h-2 flex-1 rounded-full transition-colors duration-300",
                i <= step ? "bg-accent" : "bg-hover",
              )}
            />
          ))}
        </div>
        <div className={cn("transition-opacity duration-500", landed ? "opacity-100" : "opacity-0")}>
          <h1 className="mt-6 text-[30px] leading-tight font-bold tracking-[-0.025em] text-ink">
            You&apos;re {LEVEL_NAMES[level]}!
          </h1>
          <p className="mt-2 text-[15px] text-muted">Your teachers will now pitch their English at {level}.</p>
          <PrimaryButton onClick={onDone} className="mt-7" disabled={!landed}>
            See my full results
            <ArrowRight className="size-4" />
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
