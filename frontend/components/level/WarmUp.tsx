"use client";

import { Check, Flame, Headphones, LoaderCircle, Pause, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CEFR_LEVELS, LEVEL_NAMES, type LevelTest, type QuizFeedback, type QuizQuestion } from "@/lib/api";
import { cn } from "@/lib/utils";
import { rank } from "./shared";

const OPTION_KEYS = ["A", "B", "C", "D"];
const PRAISE = ["Nice!", "Spot on!", "Great!", "You got it!", "Excellent!", "Perfect!", "Well done!"];
const ENCOURAGE = ["Not quite.", "Close one.", "Almost.", "Good try."];
const ROUND_LABEL = {
  fill: "Fill the gap",
  listen: "Listen and choose",
  judge: "Does this sound right?",
} as const;

type Stage = "warmup" | "chat" | "level";

export function JourneyBar({
  stage,
  warm,
  chat,
  onPause,
}: {
  stage: Stage;
  warm: { done: number; total: number } | null;
  chat: { done: number; total: number };
  onPause?: () => void;
}) {
  const steps = [
    ...(warm ? [{ id: "warmup" as const, label: "Warm-up", done: warm.done, total: warm.total }] : []),
    { id: "chat" as const, label: "Chat", done: chat.done, total: chat.total },
    { id: "level" as const, label: "Your level", done: stage === "level" ? 1 : 0, total: 1 },
  ];
  const order = steps.map((s) => s.id);
  const current = order.indexOf(stage);
  return (
    <div className="border-b border-line/70">
      <div className="mx-auto flex w-full max-w-4xl items-center gap-4 px-4 py-3 md:px-6">
        <ol className="flex min-w-0 flex-1 items-center gap-2">
          {steps.map((step, i) => {
            const state = i < current ? "done" : i === current ? "active" : "todo";
            const fill = state === "done" ? 100 : state === "active" ? (step.done / step.total) * 100 : 0;
            return (
              <li key={step.id} className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs">
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      state === "done" && "bg-accent text-accent-ink",
                      state === "active" && "bg-ink text-bg",
                      state === "todo" && "bg-hover text-subtle",
                    )}
                  >
                    {state === "done" ? <Check className="size-2.5" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={cn("truncate", state === "todo" ? "text-subtle" : "font-semibold text-ink")}>
                    {step.label}
                  </span>
                  {state === "active" && step.id !== "level" && (
                    <span className="ml-auto hidden text-subtle tabular-nums sm:inline">
                      {step.done}/{step.total}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-hover">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-500"
                    style={{ width: `${fill}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
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

function useSpeaker() {
  const [playing, setPlaying] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
      const voice = voices.find((v) => /en-(gb|us)/i.test(v.lang) && /google|natural|samantha|daniel/i.test(v.name));
      if (voice ?? voices[0]) utterance.voice = (voice ?? voices[0])!;
      utterance.rate = 0.92;
      utterance.onstart = () => setPlaying(true);
      utterance.onend = () => setPlaying(false);
      utterance.onerror = () => setPlaying(false);
      synth.speak(utterance);
    },
    [supported],
  );

  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  return { speak, playing, supported };
}

type Pending = {
  questionId: string;
  choice: number;
  feedback: QuizFeedback | null;
  next: LevelTest | null;
  error: string | null;
};

export function WarmUp({
  test,
  onAnswer,
  onAdvance,
  onPause,
}: {
  test: LevelTest;
  onAnswer: (choice: number) => Promise<LevelTest>;
  onAdvance: (next: LevelTest) => void;
  onPause: () => void;
}) {
  const quiz = test.quiz!;
  const question = quiz.current!;
  const [state, setPending] = useState<Pending | null>(null);
  const pending = state?.questionId === question.id ? state : null;
  const card = useRef<HTMLDivElement>(null);
  const answered = pending?.feedback != null;

  const advanced = useRef(new Set<string>());
  const advance = useCallback(() => {
    if (!pending?.next || advanced.current.has(pending.questionId)) return;
    advanced.current.add(pending.questionId);
    onAdvance(pending.next);
  }, [pending, onAdvance]);

  const choose = useCallback(
    async (choice: number) => {
      if (pending && !pending.error) return;
      const questionId = question.id;
      const feedback: QuizFeedback = {
        correct: choice === question.answer,
        answer: question.answer_text,
        sentence: question.sentence,
      };
      setPending({ questionId, choice, feedback, next: null, error: null });
      if (card.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        card.current.animate(
          feedback.correct
            ? [{ transform: "scale(1)" }, { transform: "scale(1.015)" }, { transform: "scale(1)" }]
            : [
                { transform: "translateX(0)" },
                { transform: "translateX(-8px)" },
                { transform: "translateX(8px)" },
                { transform: "translateX(-4px)" },
                { transform: "translateX(0)" },
              ],
          { duration: feedback.correct ? 320 : 380, easing: "ease-out" },
        );
      }
      const minimum = new Promise((resolve) => window.setTimeout(resolve, feedback.correct ? 1100 : 2400));
      try {
        const next = await onAnswer(choice);
        setPending((p) => (p && p.questionId === questionId ? { ...p, next } : p));
        await minimum;
        if (!advanced.current.has(questionId)) {
          advanced.current.add(questionId);
          onAdvance(next);
        }
      } catch (err) {
        setPending({
          questionId,
          choice,
          feedback: null,
          next: null,
          error: err instanceof Error ? err.message : "Try again.",
        });
      }
    },
    [pending, question, onAnswer, onAdvance],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (answered && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        advance();
        return;
      }
      const key = e.key.toUpperCase();
      let index = -1;
      if (question.format === "judge") index = ["1", "Y"].includes(key) ? 0 : ["2", "N"].includes(key) ? 1 : -1;
      else index = OPTION_KEYS.indexOf(key) >= 0 ? OPTION_KEYS.indexOf(key) : ["1", "2", "3", "4"].indexOf(key);
      if (index >= 0) {
        e.preventDefault();
        void choose(index);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question.format, answered, advance, choose]);

  const praise = useMemo(
    () => PRAISE[(quiz.answered * 7 + question.id.length) % PRAISE.length],
    [quiz.answered, question.id],
  );
  const encourage = useMemo(() => ENCOURAGE[quiz.answered % ENCOURAGE.length], [quiz.answered]);
  const streak = pending?.next?.quiz?.streak ?? quiz.streak;
  const climb = pending?.next?.quiz?.climb ?? quiz.climb;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <JourneyBar
        stage="warmup"
        warm={{ done: quiz.answered + (answered ? 1 : 0), total: quiz.total }}
        chat={{ done: 0, total: test.question_count }}
        onPause={onPause}
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-8 md:grid-cols-[minmax(0,1fr)_150px] md:px-6 md:py-10">
          <div key={question.id} className="animate-in min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold tracking-wider text-subtle uppercase">
                Round {quiz.answered + 1} · {ROUND_LABEL[question.format]}
              </p>
              <Streak count={streak} />
            </div>

            <div
              ref={card}
              className={cn(
                "mt-3 rounded-3xl border bg-surface p-6 transition-colors md:p-8",
                pending?.feedback
                  ? pending.feedback.correct
                    ? "border-success/50"
                    : "border-danger/40"
                  : "border-line",
              )}
            >
              <Prompt question={question} pending={pending} />
              <Options question={question} pending={pending} onChoose={(i) => void choose(i)} />
            </div>

            <div className="mt-4 min-h-16">
              {pending?.feedback ? (
                <FeedbackBar
                  feedback={pending.feedback}
                  title={pending.feedback.correct ? praise : encourage}
                  ready={Boolean(pending.next)}
                  onNext={advance}
                />
              ) : pending?.error ? (
                <p
                  role="alert"
                  className="rounded-xl border border-danger/25 bg-danger/6 px-4 py-3 text-sm text-danger"
                >
                  {pending.error}{" "}
                  <button
                    type="button"
                    onClick={() => setPending(null)}
                    className="font-semibold text-ink underline-offset-4 hover:underline"
                  >
                    Try again
                  </button>
                </p>
              ) : (
                <p className="text-center text-xs text-subtle">
                  {question.format === "judge" ? (
                    <>
                      Press <kbd className="kbd">Y</kbd> or <kbd className="kbd">N</kbd>
                    </>
                  ) : (
                    <>
                      Press <kbd className="kbd">A</kbd>–<kbd className="kbd">D</kbd>
                    </>
                  )}{" "}
                  to answer. No idea? Take your best guess.
                </p>
              )}
            </div>
          </div>

          <Ladder climb={climb} />
        </div>
      </div>
    </div>
  );
}

function Streak({ count }: { count: number }) {
  if (count < 2) return null;
  return (
    <span
      key={count}
      className="animate-in inline-flex items-center gap-1 rounded-full bg-[#f97316]/12 px-2.5 py-1 text-xs font-bold text-[#ea580c]"
    >
      <Flame className="size-3.5" />
      {count} in a row
    </span>
  );
}

function Ladder({ climb }: { climb: (typeof CEFR_LEVELS)[number] }) {
  const index = rank(climb);
  return (
    <aside className="hidden md:block">
      <p className="text-xs font-semibold tracking-wider text-subtle uppercase">Difficulty</p>
      <ol className="mt-3 flex flex-col-reverse gap-1.5">
        {CEFR_LEVELS.map((level, i) => (
          <li
            key={level}
            className={cn(
              "flex h-9 items-center justify-between rounded-lg px-2.5 text-xs transition-all duration-500",
              i === index
                ? "bg-accent font-bold text-accent-ink shadow-sm"
                : i < index
                  ? "bg-accent-soft font-semibold text-accent"
                  : "bg-hover text-subtle",
            )}
          >
            {level}
            {i === index && <span className="text-[10px] font-semibold opacity-90">you</span>}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Right answers climb to harder questions. You&apos;re at {LEVEL_NAMES[climb].toLowerCase()} right now.
      </p>
    </aside>
  );
}

function Gap({ text, tone }: { text: string | null; tone: "empty" | "picked" | "right" | "wrong" }) {
  return (
    <span
      className={cn(
        "mx-1 inline-block min-w-20 rounded-md border-b-2 px-1.5 text-center transition-colors",
        tone === "empty" && "border-subtle text-transparent",
        tone === "picked" && "border-accent text-accent",
        tone === "right" && "border-success bg-success/10 text-success",
        tone === "wrong" && "border-danger bg-danger/10 text-danger line-through",
      )}
    >
      {text ?? "…"}
    </span>
  );
}

function Sentence({ question, gap }: { question: QuizQuestion; gap: React.ReactNode }) {
  const [before, ...rest] = question.question.split("___");
  return (
    <p className="text-[22px] leading-relaxed font-semibold tracking-[-0.01em] text-ink md:text-[26px]">
      {before}
      {gap}
      {rest.join("___")}
    </p>
  );
}

function Prompt({ question, pending }: { question: QuizQuestion; pending: Pending | null }) {
  const { speak, playing, supported } = useSpeaker();
  const [showText, setShowText] = useState(!supported);
  const feedback = pending?.feedback;

  useEffect(() => {
    if (question.format === "listen" && question.audio && supported) {
      const t = window.setTimeout(() => speak(question.audio!), 350);
      return () => window.clearTimeout(t);
    }
  }, [question.id, question.format, question.audio, supported, speak]);

  if (question.format === "judge") {
    const right = feedback?.correct === undefined ? null : feedback;
    return (
      <>
        <Sentence
          question={question}
          gap={
            <Gap text={question.shown} tone={!right ? "picked" : right.answer === question.shown ? "right" : "wrong"} />
          }
        />
        {right && right.answer !== question.shown && (
          <p className="mt-2 text-sm text-muted">
            It should be <span className="font-semibold text-success">{right.answer}</span>.
          </p>
        )}
      </>
    );
  }

  if (question.format === "listen" && !feedback) {
    return (
      <div className="flex flex-col items-center py-2 text-center">
        <button
          type="button"
          onClick={() => question.audio && speak(question.audio)}
          disabled={!supported}
          aria-label="Play the sentence"
          className={cn(
            "flex size-20 items-center justify-center rounded-full bg-accent text-accent-ink transition-transform hover:scale-105 active:scale-95 disabled:opacity-50",
            playing && "animate-pulse",
          )}
        >
          {playing ? <Volume2 className="size-8" /> : <Headphones className="size-8" />}
        </button>
        <p className="mt-3 text-sm text-muted">
          {supported ? "Listen to the sentence. Which word did you hear?" : "Audio isn't available in this browser."}
        </p>
        {supported && (
          <button
            type="button"
            onClick={() => setShowText((v) => !v)}
            className="mt-1 text-xs font-semibold text-subtle underline-offset-4 hover:text-ink hover:underline"
          >
            {showText ? "Hide the sentence" : "Can't listen right now? Show the sentence"}
          </button>
        )}
        {showText && (
          <div className="mt-4">
            <Sentence question={question} gap={<Gap text={null} tone="empty" />} />
          </div>
        )}
      </div>
    );
  }

  const picked = pending ? question.options[pending.choice] : null;
  const tone = !feedback ? (picked ? "picked" : "empty") : feedback.correct ? "right" : "wrong";
  return (
    <>
      <Sentence question={question} gap={<Gap text={picked} tone={tone} />} />
      {feedback && !feedback.correct && (
        <p className="mt-2 text-sm text-muted">
          The answer is <span className="font-semibold text-success">{feedback.answer}</span>.
        </p>
      )}
    </>
  );
}

function Options({
  question,
  pending,
  onChoose,
}: {
  question: QuizQuestion;
  pending: Pending | null;
  onChoose: (index: number) => void;
}) {
  const feedback = pending?.feedback;

  if (question.format === "judge") {
    return (
      <div className="mt-7 grid grid-cols-2 gap-3">
        {[
          { label: "Sounds right", icon: Check, key: "Y" },
          { label: "Something's wrong", icon: X, key: "N" },
        ].map(({ label, icon: Icon, key }, i) => {
          const chosen = pending?.choice === i;
          return (
            <button
              key={label}
              type="button"
              disabled={Boolean(pending)}
              onClick={() => onChoose(i)}
              className={cn(
                "flex h-16 items-center justify-center gap-2 rounded-2xl border text-[15px] font-semibold transition-all",
                !pending && "border-line bg-surface text-ink hover:-translate-y-0.5 hover:border-accent/50",
                chosen && !feedback && "border-accent bg-accent-soft text-ink",
                chosen && feedback?.correct && "border-success bg-success/10 text-success",
                chosen && feedback && !feedback.correct && "border-danger bg-danger/8 text-danger",
                pending && !chosen && "border-line text-subtle opacity-60",
              )}
            >
              <Icon className="size-5" />
              {label}
              <kbd className="kbd ml-1 hidden sm:inline-flex">{key}</kbd>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
      {question.options.map((option, i) => {
        const chosen = pending?.choice === i;
        const isAnswer = feedback && option === feedback.answer;
        return (
          <button
            key={option}
            type="button"
            disabled={Boolean(pending)}
            onClick={() => onChoose(i)}
            className={cn(
              "flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] transition-all",
              !pending && "border-line bg-surface text-ink hover:-translate-y-0.5 hover:border-accent/50",
              chosen && !feedback && "border-accent bg-accent-soft font-semibold text-ink",
              isAnswer && "border-success bg-success/10 font-semibold text-success",
              chosen && feedback && !feedback.correct && "border-danger bg-danger/8 text-danger",
              pending && !chosen && !isAnswer && "border-line text-subtle opacity-60",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold",
                isAnswer ? "bg-success text-white" : chosen ? "bg-accent text-accent-ink" : "bg-hover text-muted",
              )}
            >
              {isAnswer ? <Check className="size-3.5" strokeWidth={3} /> : OPTION_KEYS[i]}
            </span>
            {option}
          </button>
        );
      })}
    </div>
  );
}

function FeedbackBar({
  feedback,
  title,
  ready,
  onNext,
}: {
  feedback: QuizFeedback;
  title: string;
  ready: boolean;
  onNext: () => void;
}) {
  return (
    <div
      className={cn(
        "animate-in flex items-center gap-3 rounded-2xl px-4 py-3",
        feedback.correct ? "bg-success/10" : "bg-danger/8",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-white",
          feedback.correct ? "bg-success" : "bg-danger",
        )}
      >
        {feedback.correct ? <Check className="size-5" strokeWidth={3} /> : <X className="size-5" strokeWidth={3} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-bold", feedback.correct ? "text-success" : "text-danger")}>{title}</p>
        <p className="truncate text-sm text-ink">{feedback.sentence}</p>
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={!ready}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-surface disabled:opacity-60"
      >
        {!ready && <LoaderCircle className="size-3.5 animate-spin" />}
        Next
      </button>
    </div>
  );
}
