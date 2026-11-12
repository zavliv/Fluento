"use client";

import {
  ArrowRight,
  Check,
  CircleCheck,
  CircleX,
  Flame,
  Headphones,
  LoaderCircle,
  PenLine,
  SpellCheck,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LevelTest, QuizFeedback, QuizQuestion } from "@/lib/api";
import { cn } from "@/lib/utils";
import { FocusBar, PrimaryButton, useSpeaker } from "./shared";

const PRAISE = ["Nice, that's right", "Spot on", "Great job", "You got it", "Excellent", "Perfect"];
const ENCOURAGE = ["Not quite", "Close one", "Almost", "Good try"];
const ROUND = {
  fill: { label: "Fill the gap", hint: "Choose the word that fits the sentence.", icon: PenLine },
  listen: { label: "Listen", hint: "Listen, then pick the missing word.", icon: Headphones },
  judge: { label: "Spot the mistake", hint: "Is the highlighted word used correctly?", icon: SpellCheck },
} as const;

type Answer = {
  questionId: string;
  choice: number;
  feedback: QuizFeedback;
  next: HasQuiz | null;
  error: string | null;
};

type HasQuiz = { quiz: LevelTest["quiz"] };

export function WarmUp<T extends HasQuiz>({
  test,
  onAnswer,
  onAdvance,
  onClose,
}: {
  test: T;
  onAnswer: (choice: number) => Promise<T>;
  onAdvance: (next: T) => void;
  onClose: () => void;
}) {
  const quiz = test.quiz!;
  const question = quiz.current!;
  const [state, setState] = useState<Answer | null>(null);
  const answer = state?.questionId === question.id ? state : null;
  const card = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const [preview, setPreview] = useState<{ id: string; index: number } | null>(null);
  const previewIndex = !answer && preview?.id === question.id ? preview.index : null;

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
    if (answer?.next) onAdvance(answer.next as T);
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

  const results = [...(quiz.results ?? []), ...(answer ? [answer.feedback.correct] : [])];
  const streak = answer ? (answer.feedback.correct ? (answer.next?.quiz?.streak ?? quiz.streak + 1) : 0) : quiz.streak;
  const title = useMemo(
    () =>
      answer?.feedback.correct
        ? PRAISE[(quiz.answered + question.id.length) % PRAISE.length]
        : ENCOURAGE[quiz.answered % ENCOURAGE.length],
    [answer?.feedback.correct, quiz.answered, question.id],
  );
  const round = ROUND[question.format];
  const RoundIcon = round.icon;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <FocusBar
        onClose={onClose}
        steps={{ total: quiz.total, results }}
        right={
          <div className="flex items-center gap-2.5">
            {streak >= 2 && (
              <span
                key={streak}
                className="animate-in inline-flex items-center gap-1 rounded-full bg-[#ea580c]/12 px-2.5 py-1 text-xs font-bold text-[#ea580c] tabular-nums"
                title={`${streak} right in a row`}
              >
                <Flame className="size-3.5" />
                {streak}
              </span>
            )}
            <span className="text-sm font-semibold text-muted tabular-nums">
              {Math.min(quiz.answered + 1, quiz.total)}
              <span className="text-subtle"> / {quiz.total}</span>
            </span>
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 overflow-y-auto">
        <div key={question.id} className="animate-in m-auto w-full max-w-2xl px-5 pt-6 pb-40">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <RoundIcon className="size-4" />
            </span>
            <div>
              <p className="text-sm leading-tight font-semibold text-ink">{round.label}</p>
              <p className="text-xs text-muted">{round.hint}</p>
            </div>
          </div>
          <div ref={card} className="mt-4">
            <div className="rounded-3xl border border-line bg-surface px-6 py-8 md:px-9 md:py-10">
              <Prompt question={question} answer={answer} preview={previewIndex} />
            </div>
            <Choices
              question={question}
              answer={answer}
              onChoose={choose}
              onPreview={(index) => setPreview(index === null ? null : { id: question.id, index })}
            />
          </div>
          <p className={cn("mt-6 hidden text-center text-xs text-subtle sm:block", answer && "invisible")}>
            {question.format === "judge" ? (
              <>
                Press <kbd className="kbd">Y</kbd> or <kbd className="kbd">N</kbd>
              </>
            ) : (
              <>
                Press <kbd className="kbd">1</kbd>–<kbd className="kbd">4</kbd>
              </>
            )}{" "}
            · Not sure? Take your best guess.
          </p>
        </div>
      </div>

      <Sheet
        answer={answer}
        title={title}
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
  continueRef,
  onContinue,
  onRetry,
}: {
  answer: Answer | null;
  title: string;
  continueRef: React.RefObject<HTMLButtonElement | null>;
  onContinue: () => void;
  onRetry: (choice: number) => void;
}) {
  if (!answer) return null;

  const { feedback, error } = answer;
  return (
    <div
      className={cn(
        "sheet-up absolute inset-x-0 bottom-0 border-t bg-bg",
        feedback.correct ? "border-success/30" : "border-danger/25",
      )}
    >
      <div className={cn(feedback.correct ? "bg-success/10" : "bg-danger/8")}>
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
                    <span className="mt-0.5 block text-muted">{feedback.sentence}</span>
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
            className={cn(
              "w-full sm:w-44",
              feedback.correct ? "bg-success text-status-ink" : "bg-danger text-status-ink",
            )}
          >
            {!answer.next && !error ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Continue
            {answer.next && <ArrowRight className="size-4" />}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

type GapTone = "empty" | "preview" | "right" | "wrong" | "neutral";

function Gap({ text, tone }: { text: string | null; tone: GapTone }) {
  return (
    <span
      className={cn(
        "mx-1 inline-block min-w-28 rounded-xl border-2 px-3 py-0.5 text-center leading-[1.3] transition-colors duration-150",
        tone === "empty" && "border-dashed border-line bg-hover/60 text-transparent",
        tone === "preview" && "border-dashed border-accent/70 bg-accent-soft text-accent",
        tone === "neutral" && "border-accent bg-accent-soft text-accent",
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
    <p className="text-[24px] leading-[1.6] font-semibold tracking-[-0.015em] text-ink md:text-[30px]">
      {before}
      <span className="whitespace-nowrap">
        {gap}
        {punctuation}
      </span>
      {after.slice(punctuation.length)}
    </p>
  );
}

function Prompt({
  question,
  answer,
  preview,
}: {
  question: QuizQuestion;
  answer: Answer | null;
  preview: number | null;
}) {
  const { speak, playing, loading, supported } = useSpeaker();
  const [showText, setShowText] = useState(!supported);
  const feedback = answer?.feedback;
  const ghost = preview !== null ? question.options[preview] : null;
  const openGap = <Gap text={ghost} tone={ghost ? "preview" : "empty"} />;

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
      <div className="flex flex-col items-center text-center">
        <button
          type="button"
          onClick={() => question.audio && speak(question.audio)}
          disabled={!supported}
          aria-label="Play the sentence again"
          className="relative flex size-24 items-center justify-center rounded-full bg-accent text-accent-ink transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {playing && <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-25" />}
          {loading ? (
            <LoaderCircle className="relative size-9 animate-spin" />
          ) : playing ? (
            <Volume2 className="relative size-10" />
          ) : (
            <Headphones className="relative size-10" />
          )}
        </button>
        <p className="mt-4 text-[15px] font-medium text-ink">
          {!supported ? "Audio isn't available in this browser." : playing ? "Listening…" : "Tap to play again"}
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
          <div className="mt-6 w-full border-t border-line pt-6 text-left">
            <Sentence question={question} gap={openGap} />
          </div>
        )}
      </div>
    );
  }

  return <Sentence question={question} gap={feedback ? <Gap text={feedback.answer} tone="right" /> : openGap} />;
}

function Choices({
  question,
  answer,
  onChoose,
  onPreview,
}: {
  question: QuizQuestion;
  answer: Answer | null;
  onChoose: (index: number) => void;
  onPreview: (index: number | null) => void;
}) {
  if (question.format === "judge") {
    return (
      <div className="mt-4 grid grid-cols-2 gap-3">
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
                "group flex h-16 items-center justify-center gap-2.5 rounded-2xl border-2 px-3 text-[15px] font-semibold transition-[border-color,background-color,color,transform] active:scale-[0.98]",
                !answer && "border-line bg-surface text-ink hover:border-accent hover:bg-accent-soft/50",
                isAnswer && "border-success bg-success/10 text-success",
                chosen && !isAnswer && "border-danger bg-danger/8 text-danger",
                answer && !chosen && !isAnswer && "border-line text-subtle opacity-70",
              )}
            >
              <Icon className="size-5 shrink-0" />
              {label}
              {!answer && <kbd className="kbd hidden group-hover:border-accent/50 sm:inline-flex">{key}</kbd>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2" onMouseLeave={() => onPreview(null)}>
      {question.options.map((option, i) => {
        const chosen = answer?.choice === i;
        const isAnswer = Boolean(answer) && i === question.answer;
        return (
          <button
            key={option}
            type="button"
            disabled={Boolean(answer)}
            onClick={() => onChoose(i)}
            onMouseEnter={() => onPreview(i)}
            onFocus={() => onPreview(i)}
            onBlur={() => onPreview(null)}
            className={cn(
              "group flex h-14 items-center gap-3 rounded-2xl border-2 px-3.5 text-left text-[16px] font-medium transition-[border-color,background-color,color,transform] active:scale-[0.98]",
              !answer && "border-line bg-surface text-ink hover:border-accent hover:bg-accent-soft/50",
              isAnswer && "border-success bg-success/10 font-semibold text-success",
              chosen && !isAnswer && "border-danger bg-danger/8 text-danger",
              answer && !chosen && !isAnswer && "border-line text-subtle opacity-60",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition-colors",
                isAnswer
                  ? "border-success bg-success text-status-ink"
                  : chosen
                    ? "border-danger bg-danger text-status-ink"
                    : "border-line text-muted group-hover:border-accent group-hover:text-accent",
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
            <span className="min-w-0 truncate">{option}</span>
          </button>
        );
      })}
    </div>
  );
}
