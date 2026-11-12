"use client";

import { ArrowRight, Award, LoaderCircle, Mic, PartyPopper, Shuffle, Trophy, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, CEFR_LEVELS, LEVEL_NAMES, type CefrLevel, type LevelTest, type LevelTestState } from "@/lib/api";
import type { Teacher } from "@/lib/teachers";
import { cn } from "@/lib/utils";
import { stopSpeech } from "@/lib/speech";
import { useToast } from "../ui/Toast";
import { ChatRound } from "./ChatRound";
import { ResultView } from "./Results";
import { Centered, FocusBar, LevelBadge, PrimaryButton, when } from "./shared";
import { WarmUp } from "./WarmUp";

type Props = {
  teachers: Teacher[];
  onOpenTeacher: (teacherId: string) => void;
  onPractise: (teacherId: string, text: string) => void;
  onCompleted: () => void;
  onClose: () => void;
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

export function LevelTestPage({ teachers, onOpenTeacher, onPractise, onCompleted, onClose }: Props) {
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
      setTest(await api.startLevelTest(topic));
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

  const answerChat = async (text: string, voice: boolean): Promise<boolean> => {
    if (!test || busy) return false;
    const before = test;
    const last = test.answered + 1 >= test.question_count;
    setTest({
      ...test,
      answered: test.answered + 1,
      messages: [...test.messages, { role: "learner", content: text, mode: voice ? "voice" : "typed" }],
    });
    setBusy(true);
    setError(null);
    try {
      const next = await api.answerLevelTest(test.id, text, voice ? "voice" : "typed");
      if (next.status === "completed") finished(next);
      else setTest(next);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      if (!last) setTest(before);
      return false;
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

  const leave = () => {
    stopSpeech();
    onClose();
  };

  if (loadError) {
    return (
      <>
        <FocusBar onClose={leave} />
        <Centered>
          <p className="rounded-xl bg-danger/8 px-4 py-3 text-sm text-danger">{loadError}</p>
        </Centered>
      </>
    );
  }
  if (!state) {
    return (
      <div className="flex flex-1 items-center justify-center text-subtle">
        <LoaderCircle className="size-6 animate-spin" aria-label="Loading" />
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
        onClose={leave}
      />
    );
  }

  if (phase === "interlude" && test) {
    return <Interlude test={test} onContinue={() => setPhase("test")} onClose={leave} />;
  }

  if (phase === "test" && test) {
    if (test.answered >= test.question_count) {
      return <Grading busy={busy} error={error} onRetry={() => void retryGrading()} onClose={leave} />;
    }
    return <ChatRound test={test} busy={busy} error={error} onAnswer={answerChat} onClose={leave} />;
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
        onClose={leave}
      />
    );
  }

  return (
    <Intro
      state={state}
      onClose={leave}
      onStart={() => setPhase("topic")}
      onResume={(current) => {
        setTest(current);
        setError(null);
        setPhase(current.phase === "chat" && current.answered === 0 && current.quiz ? "interlude" : "test");
      }}
      onShowResult={() => {
        setTest(state.latest);
        setPhase("result");
      }}
    />
  );
}

function Intro({
  state,
  onClose,
  onStart,
  onResume,
  onShowResult,
}: {
  state: LevelTestState;
  onClose: () => void;
  onStart: () => void;
  onResume: (test: LevelTest) => void;
  onShowResult: () => void;
}) {
  const { config, current, latest } = state;
  const minutes = Math.max(
    3,
    Math.round((config.quiz_enabled ? config.quiz_count * 0.25 : 0) + config.question_count * 0.8),
  );
  const facts = [
    ...(config.quiz_enabled ? [{ icon: Zap, text: `${config.quiz_count} quick rounds` }] : []),
    { icon: Mic, text: `${config.question_count} questions to answer` },
    { icon: Award, text: "Level A1 to C2" },
  ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && config.enabled && !(e.target as HTMLElement)?.closest("button")) {
        if (current) onResume(current);
        else onStart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [config.enabled, current, onResume, onStart]);

  return (
    <>
      <FocusBar
        onClose={onClose}
        right={
          latest?.result && (
            <button
              type="button"
              onClick={onShowResult}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent-soft px-3.5 text-xs font-semibold text-accent transition-opacity hover:opacity-80"
            >
              Last result · {latest.result.level}
              <ArrowRight className="size-3.5" />
            </button>
          )
        }
      />
      <Centered>
        <div className="animate-in">
          <span className="mx-auto flex size-16 items-center justify-center rounded-[20px] bg-accent-soft text-accent">
            <Trophy className="size-8" />
          </span>
          <h1 className="mt-6 text-[32px] leading-tight font-bold tracking-[-0.03em] text-ink md:text-[38px]">
            Find your English level
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-[16px] leading-relaxed text-muted">
            A quick game, then a short chat about something you enjoy. About {minutes} minutes.
          </p>

          <ul className="mt-8 flex flex-wrap justify-center gap-x-7 gap-y-2 text-sm text-muted">
            {facts.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2">
                <Icon className="size-4 text-accent" />
                {text}
              </li>
            ))}
          </ul>

          {!config.enabled ? (
            <p className="mx-auto mt-10 max-w-sm rounded-xl bg-hover px-4 py-3 text-sm text-muted">
              The level test is turned off right now. Please check back later.
            </p>
          ) : current ? (
            <div className="mx-auto mt-10 flex max-w-xs flex-col gap-3">
              <PrimaryButton onClick={() => onResume(current)}>Continue where you left off</PrimaryButton>
              <button type="button" onClick={onStart} className="text-sm font-semibold text-muted hover:text-ink">
                Start a new test
              </button>
            </div>
          ) : (
            <PrimaryButton onClick={onStart} className="mt-10 w-full max-w-xs">
              {latest ? "Take it again" : "Start"}
            </PrimaryButton>
          )}
          {latest?.result && !current && (
            <p className="mt-4 text-xs text-subtle">
              Last tested {when(latest.completed_at ?? latest.created_at)} at {latest.result.level}
            </p>
          )}
        </div>
      </Centered>
    </>
  );
}

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
    <>
      <FocusBar onClose={onBack} closeLabel="Back" />
      <Centered className="max-w-2xl">
        <div className="animate-in">
          <h1 className="text-[28px] leading-tight font-bold tracking-[-0.025em] text-ink md:text-[32px]">
            What do you like talking about?
          </h1>
          <p className="mt-2 text-[16px] text-muted">Your chat questions will be about this.</p>
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
                style={{ animationDelay: `${i * 35}ms` }}
                className={cn(
                  "animate-in flex h-28 flex-col items-center justify-center gap-2.5 rounded-2xl border-2 bg-surface px-3 transition-all",
                  chosen ? "border-accent bg-accent-soft" : "border-line hover:-translate-y-0.5 hover:border-accent/50",
                  busy && !chosen && "opacity-50",
                )}
              >
                <span className="text-[30px] leading-none" aria-hidden>
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

        <button
          type="button"
          onClick={() => topics.length && pick(topics[Math.floor(Math.random() * topics.length)])}
          disabled={busy || topics.length === 0}
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink disabled:opacity-50"
        >
          <Shuffle className="size-4" />
          Surprise me
        </button>
      </Centered>
    </>
  );
}

function Interlude({ test, onContinue, onClose }: { test: LevelTest; onContinue: () => void; onClose: () => void }) {
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
    <>
      <FocusBar onClose={onClose} progress={0} />
      <Centered>
        <div className="animate-in">
          <span className="mx-auto flex size-16 items-center justify-center rounded-[20px] bg-success/12 text-success">
            <PartyPopper className="size-8" />
          </span>
          <h1 className="mt-6 text-[32px] leading-tight font-bold tracking-[-0.03em] text-ink">{title}</h1>
          {quiz && (
            <div className="mx-auto mt-6 grid max-w-xs grid-cols-2 gap-3">
              <div className="rounded-2xl bg-hover px-4 py-3">
                <p className="text-2xl font-bold text-ink tabular-nums">
                  {quiz.correct}/{quiz.total}
                </p>
                <p className="text-xs text-muted">right answers</p>
              </div>
              <div className="rounded-2xl bg-hover px-4 py-3">
                <p className="text-2xl font-bold text-ink">{quiz.climb}</p>
                <p className="text-xs text-muted">hardest level reached</p>
              </div>
            </div>
          )}
          <p className="mx-auto mt-8 max-w-sm text-[16px] leading-relaxed text-muted">
            Now a short chat{test.topic ? ` about ${test.topic.toLowerCase()}` : ""}. Answer out loud with the mic, or
            type if you prefer.
          </p>
          <PrimaryButton onClick={onContinue} className="mt-8 w-full max-w-xs">
            Let&apos;s chat
          </PrimaryButton>
        </div>
      </Centered>
    </>
  );
}

function Grading({
  busy,
  error,
  onRetry,
  onClose,
}: {
  busy: boolean;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}) {
  const [line, setLine] = useState(0);
  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => setLine((l) => Math.min(l + 1, GRADING_LINES.length - 1)), 1800);
    return () => window.clearInterval(timer);
  }, [busy]);

  return (
    <>
      <FocusBar onClose={onClose} progress={100} />
      <Centered>
        {error && !busy ? (
          <div className="animate-in">
            <h1 className="text-[24px] font-bold tracking-[-0.02em] text-ink">We couldn&apos;t finish grading</h1>
            <p className="mt-2 text-[15px] text-muted">{error}</p>
            <PrimaryButton onClick={onRetry} className="mt-8 w-full max-w-xs">
              Try again
            </PrimaryButton>
          </div>
        ) : (
          <div>
            <LoaderCircle className="mx-auto size-10 animate-spin text-accent" />
            <p key={line} className="animate-in mt-6 text-[17px] text-ink">
              {GRADING_LINES[line]}
            </p>
            <p className="mt-1 text-sm text-muted">This takes a few seconds.</p>
          </div>
        )}
      </Centered>
    </>
  );
}

const CONFETTI_COLORS = ["#0d9488", "#f59e0b", "#e11d48", "#6366f1", "#22c55e", "#0ea5e9"];

function Confetti() {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = box.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const pieces: HTMLSpanElement[] = [];
    for (let i = 0; i < 100; i++) {
      const piece = document.createElement("span");
      const size = 6 + Math.random() * 7;
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
      const drift = (Math.random() - 0.5) * 260;
      piece.animate(
        [
          { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
          {
            transform: `translate(${drift}px, ${root.clientHeight + 40}px) rotate(${720 * Math.random()}deg)`,
            opacity: 0.9,
          },
        ],
        {
          duration: 2600 + Math.random() * 2000,
          delay: Math.random() * 600,
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
    const timer = window.setTimeout(() => setStep((s) => s + 1), 450);
    return () => window.clearTimeout(timer);
  }, [step, landed]);

  useEffect(() => {
    if (!landed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [landed, onDone]);

  const shown = CEFR_LEVELS[Math.min(step, target)];

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      {landed && <Confetti />}
      <div className="relative m-auto w-full max-w-md px-5 text-center">
        <p className="text-sm font-semibold text-muted">{landed ? "Your English level" : "Working out your level…"}</p>
        <div key={shown} className="animate-in mt-6 flex justify-center">
          {landed ? (
            <LevelBadge level={level} size="xl" />
          ) : (
            <span className="flex size-32 items-center justify-center rounded-[32px] bg-hover text-[52px] font-bold tracking-[-0.03em] text-ink">
              {shown}
            </span>
          )}
        </div>
        <div className="mx-auto mt-7 flex max-w-xs gap-1.5">
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
          <h1 className="mt-7 text-[30px] leading-tight font-bold tracking-[-0.025em] text-ink">
            You&apos;re {LEVEL_NAMES[level]}
          </h1>
          <p className="mt-2 text-[15px] text-muted">Your teachers will now pitch their English at {level}.</p>
          <PrimaryButton onClick={onDone} className="mt-8 w-full max-w-xs" disabled={!landed}>
            See my results
            <ArrowRight className="size-4" />
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
