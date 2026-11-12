"use client";

import { Check, CircleCheck, CircleX, Flame, Headphones, LoaderCircle, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LevelTest, QuizFeedback, QuizQuestion } from "@/lib/api";
import { cn } from "@/lib/utils";
import { FocusBar, PrimaryButton, useSpeaker } from "./shared";

const PRAISE = ["Nice, that's right", "Spot on", "Great job", "You got it", "Excellent", "Perfect"];
const ENCOURAGE = ["Not quite", "Close one", "Almost", "Good try"];
const ROUND_LABEL = {
  fill: "Fill the gap",
  listen: "Listen and choose",
  judge: "Does this sound right?",
} as const;

type Answer = {
  questionId: string;
  choice: number;
  feedback: QuizFeedback;
  next: LevelTest | null;
  error: string | null;
};

export function WarmUp({
  test,
  onAnswer,
  onAdvance,
  onClose,
}: {
  test: LevelTest;
  onAnswer: (choice: number) => Promise<LevelTest>;
  onAdvance: (next: LevelTest) => void;
  onClose: () => void;
}) {
  const quiz = test.quiz!;
  const question = quiz.current!;
  const [state, setState] = useState<Answer | null>(null);
  const answer = state?.questionId === question.id ? state : null;
  const card = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  const send = useCallback(
    async (choice: number) => {
      const questionId = question.id;
      setState((s) => (s && s.questionId === questionId ? { ...s, error: null } : s));
      try {
        const next = await onAnswer(choice);
        setState((s) => (s && s.questionId === questionId ? { ...s, next } : s));
      } catch (err) {
        setState((s) =>
          s && s.questionId === questionId
            ? { ...s, error: err instanceof Error ? err.message : "Couldn't save your answer." }
            : s,
        );
      }
    },
    [question.id, onAnswer],
  );

  const choose = useCallback(
    (choice: number) => {
      if (answer) return;
      const feedback: QuizFeedback = {
        correct: choice === question.answer,
        answer: question.answer_text,
        sentence: question.sentence,
      };
      setState({ questionId: question.id, choice, feedback, next: null, error: null });
      if (card.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        card.current.animate(
          feedback.correct
            ? [{ transform: "scale(1)" }, { transform: "scale(1.02)" }, { transform: "scale(1)" }]
            : [
                { transform: "translateX(0)" },
                { transform: "translateX(-10px)" },
                { transform: "translateX(10px)" },
                { transform: "translateX(-5px)" },
                { transform: "translateX(0)" },
              ],
          { duration: 360, easing: "ease-out" },
        );
      }
      void send(choice);
    },
    [answer, question, send],
  );

  const proceed = useCallback(() => {
    if (answer?.next) onAdvance(answer.next);
  }, [answer, onAdvance]);

  useEffect(() => {
    if (answer?.next) continueRef.current?.focus();
  }, [answer?.next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (answer) {
        if (e.key === "Enter" && answer.next && document.activeElement !== continueRef.current) {
          e.preventDefault();
          proceed();
        }
        return;
      }
      const key = e.key.toUpperCase();
      let index = -1;
      if (question.format === "judge") index = ["1", "Y"].includes(key) ? 0 : ["2", "N"].includes(key) ? 1 : -1;
      else index = Math.max(["1", "2", "3", "4"].indexOf(key), ["A", "B", "C", "D"].indexOf(key));
      if (index >= 0) {
        e.preventDefault();
        choose(index);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, question.format, choose, proceed]);

  const done = quiz.answered + (answer ? 1 : 0);
  const streak = answer ? (answer.feedback.correct ? (answer.next?.quiz?.streak ?? quiz.streak + 1) : 0) : quiz.streak;
  const title = useMemo(
    () =>
      answer?.feedback.correct
        ? PRAISE[(quiz.answered + question.id.length) % PRAISE.length]
        : ENCOURAGE[quiz.answered % ENCOURAGE.length],
    [answer?.feedback.correct, quiz.answered, question.id],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FocusBar
        onClose={onClose}
        progress={(done / quiz.total) * 100}
        right={
          <span
            className={cn(
              "inline-flex items-center gap-1 text-sm font-bold tabular-nums transition-colors",
              streak >= 2 ? "text-[#ea580c]" : "text-subtle",
            )}
            title={`${streak} in a row`}
          >
            <Flame className="size-[18px]" />
            {streak}
          </span>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div key={question.id} className="animate-in mx-auto w-full max-w-2xl px-5 pt-8 pb-10 md:pt-14">
          <p className="text-sm font-semibold text-muted">{ROUND_LABEL[question.format]}</p>
          <div ref={card} className="mt-3">
            <Prompt question={question} answer={answer} />
            <Choices question={question} answer={answer} onChoose={choose} />
          </div>
        </div>
      </div>

      <Sheet
        answer={answer}
        title={title}
        hint={question.format}
        continueRef={continueRef}
        onContinue={proceed}
        onRetry={(choice) => void send(choice)}
      />
    </div>
  );
}

function Sheet({
  answer,
  title,
  hint,
  continueRef,
  onContinue,
  onRetry,
}: {
  answer: Answer | null;
  title: string;
  hint: QuizQuestion["format"];
  continueRef: React.RefObject<HTMLButtonElement | null>;
  onContinue: () => void;
  onRetry: (choice: number) => void;
}) {
  if (!answer) {
    return (
      <div className="shrink-0 border-t border-line/70">
        <p className="mx-auto max-w-2xl px-5 py-5 text-center text-xs text-subtle">
          {hint === "judge" ? (
            <>
              Press <kbd className="kbd">Y</kbd> or <kbd className="kbd">N</kbd>
            </>
          ) : (
            <>
              Press <kbd className="kbd">1</kbd>–<kbd className="kbd">4</kbd>
            </>
          )}{" "}
          to answer. Not sure? Take your best guess.
        </p>
      </div>
    );
  }

  const { feedback, error } = answer;
  return (
    <div
      className={cn(
        "animate-in shrink-0 border-t",
        feedback.correct ? "border-success/25 bg-success/10" : "border-danger/20 bg-danger/8",
      )}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {feedback.correct ? (
            <CircleCheck className="size-8 shrink-0 text-success" />
          ) : (
            <CircleX className="size-8 shrink-0 text-danger" />
          )}
          <div className="min-w-0">
            <p className={cn("text-[17px] font-bold", feedback.correct ? "text-success" : "text-danger")}>{title}</p>
            <p className="mt-0.5 text-sm text-ink">
              {feedback.correct ? (
                feedback.sentence
              ) : (
                <>
                  Correct answer: <span className="font-semibold">{feedback.answer}</span>
                </>
              )}
            </p>
            {error && (
              <p className="mt-1 text-sm text-danger">
                {error}{" "}
                <button
                  type="button"
                  onClick={() => onRetry(answer.choice)}
                  className="font-semibold text-ink underline underline-offset-4"
                >
                  Retry
                </button>
              </p>
            )}
          </div>
        </div>
        <PrimaryButton
          ref={continueRef}
          onClick={onContinue}
          disabled={!answer.next}
          className={cn("w-full sm:w-44", feedback.correct ? "bg-success text-white" : "bg-danger text-white")}
        >
          {!answer.next && !error && <LoaderCircle className="size-4 animate-spin" />}
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}

function Gap({ text, tone }: { text: string | null; tone: "empty" | "right" | "wrong" | "neutral" }) {
  return (
    <span
      className={cn(
        "mx-1 inline-block min-w-24 rounded-lg border-b-[3px] px-2 text-center transition-colors",
        tone === "empty" && "border-line text-transparent",
        tone === "neutral" && "border-accent text-accent",
        tone === "right" && "border-success bg-success/10 text-success",
        tone === "wrong" && "border-danger bg-danger/10 text-danger line-through decoration-2",
      )}
    >
      {text ?? "…"}
    </span>
  );
}

function Sentence({ question, gap }: { question: QuizQuestion; gap: React.ReactNode }) {
  const [before, ...rest] = question.question.split("___");
  const after = rest.join("___");
  const punctuation = after.match(/^[,.;:!?'"’”)]+/)?.[0] ?? "";
  return (
    <p className="text-[26px] leading-[1.5] font-semibold tracking-[-0.015em] text-ink md:text-[32px]">
      {before}
      <span className="whitespace-nowrap">
        {gap}
        {punctuation}
      </span>
      {after.slice(punctuation.length)}
    </p>
  );
}

function Prompt({ question, answer }: { question: QuizQuestion; answer: Answer | null }) {
  const { speak, playing, supported } = useSpeaker();
  const [showText, setShowText] = useState(!supported);
  const feedback = answer?.feedback;

  useEffect(() => {
    if (question.format !== "listen" || !question.audio || !supported) return;
    const timer = window.setTimeout(() => speak(question.audio!), 300);
    return () => window.clearTimeout(timer);
  }, [question.id, question.format, question.audio, supported, speak]);

  if (question.format === "judge") {
    const shownIsRight = question.shown === question.answer_text;
    return (
      <Sentence
        question={question}
        gap={<Gap text={question.shown} tone={!feedback ? "neutral" : shownIsRight ? "right" : "wrong"} />}
      />
    );
  }

  if (question.format === "listen" && !feedback) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <button
          type="button"
          onClick={() => question.audio && speak(question.audio)}
          disabled={!supported}
          aria-label="Play the sentence again"
          className="relative flex size-28 items-center justify-center rounded-full bg-accent text-accent-ink transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {playing && <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-25" />}
          {playing ? <Volume2 className="relative size-11" /> : <Headphones className="relative size-11" />}
        </button>
        <p className="mt-4 text-[15px] text-ink">
          {supported ? "Which word did you hear?" : "Audio isn't available in this browser."}
        </p>
        {supported && (
          <button
            type="button"
            onClick={() => setShowText((v) => !v)}
            className="mt-1 text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            {showText ? "Hide the sentence" : "Can't listen right now? Show the sentence"}
          </button>
        )}
        {showText && (
          <div className="mt-5 text-left">
            <Sentence question={question} gap={<Gap text={null} tone="empty" />} />
          </div>
        )}
      </div>
    );
  }

  return (
    <Sentence
      question={question}
      gap={<Gap text={feedback ? feedback.answer : null} tone={feedback ? "right" : "empty"} />}
    />
  );
}

function Choices({
  question,
  answer,
  onChoose,
}: {
  question: QuizQuestion;
  answer: Answer | null;
  onChoose: (index: number) => void;
}) {
  if (question.format === "judge") {
    return (
      <div className="mt-10 grid grid-cols-2 gap-3">
        {[
          { label: "Sounds right", icon: Check, key: "Y" },
          { label: "Something's wrong", icon: X, key: "N" },
        ].map(({ label, icon: Icon, key }, i) => {
          const chosen = answer?.choice === i;
          const isAnswer = Boolean(answer) && question.answer === i;
          return (
            <button
              key={label}
              type="button"
              disabled={Boolean(answer)}
              onClick={() => onChoose(i)}
              className={cn(
                "flex h-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 text-[15px] font-semibold transition-all",
                !answer && "border-line bg-surface text-ink hover:-translate-y-0.5 hover:border-accent/60",
                isAnswer && "border-success bg-success/10 text-success",
                chosen && !isAnswer && "border-danger bg-danger/8 text-danger",
                answer && !chosen && !isAnswer && "border-line text-subtle",
              )}
            >
              <span className="flex items-center gap-2">
                <Icon className="size-5" />
                {label}
              </span>
              <kbd className="kbd hidden sm:inline-flex">{key}</kbd>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-3 sm:grid-cols-2">
      {question.options.map((option, i) => {
        const chosen = answer?.choice === i;
        const isAnswer = Boolean(answer) && i === question.answer;
        return (
          <button
            key={option}
            type="button"
            disabled={Boolean(answer)}
            onClick={() => onChoose(i)}
            className={cn(
              "flex min-h-16 items-center gap-3.5 rounded-2xl border-2 px-4 py-3 text-left text-[17px] transition-all",
              !answer && "border-line bg-surface text-ink hover:-translate-y-0.5 hover:border-accent/60",
              isAnswer && "border-success bg-success/10 font-semibold text-success",
              chosen && !isAnswer && "border-danger bg-danger/8 text-danger",
              answer && !chosen && !isAnswer && "border-line text-subtle opacity-70",
            )}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold",
                isAnswer
                  ? "border-success bg-success text-white"
                  : chosen
                    ? "border-danger bg-danger text-white"
                    : "border-line text-muted",
              )}
            >
              {isAnswer ? (
                <Check className="size-4" strokeWidth={3} />
              ) : chosen ? (
                <X className="size-4" strokeWidth={3} />
              ) : (
                i + 1
              )}
            </span>
            {option}
          </button>
        );
      })}
    </div>
  );
}
