"use client";

import {
  ArrowRight,
  Award,
  Check,
  Flame,
  Headphones,
  LoaderCircle,
  Mic,
  PenLine,
  Sparkles,
  SpellCheck,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, CEFR_LEVELS, LEVEL_NAMES, type Challenge, type ChallengeResult } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ChatRound } from "../level/ChatRound";
import { Confetti } from "../level/LevelTestPage";
import { Centered, FocusBar, LevelBadge, PrimaryButton, SecondaryButton } from "../level/shared";
import { WarmUp } from "../level/WarmUp";
import { BADGE_ICONS, FLAME, GoalRing, useCountUp } from "./visuals";

type Props = {
  onClose: () => void;
  onFinished: () => void;
  onLevelCheck: () => void;
};

export function ChallengeFlow({ onClose, onFinished, onLevelCheck }: Props) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [speakError, setSpeakError] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const reported = useRef(false);

  const load = useCallback(() => {
    api
      .startChallenge()
      .then((c) => {
        setError(null);
        setChallenge(c);
        setStarted(c.kind === "daily" || (c.quiz?.answered ?? 0) > 0);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load, round]);

  useEffect(() => {
    if (challenge?.status === "completed" && !reported.current) {
      reported.current = true;
      onFinished();
    }
  }, [challenge?.status, onFinished]);

  const again = () => {
    reported.current = false;
    setChallenge(null);
    setRound((r) => r + 1);
  };

  const speak = async (text: string, voice: boolean) => {
    if (!challenge) return false;
    setBusy(true);
    setSpeakError(null);
    try {
      setChallenge(await api.speakChallenge(challenge.id, { text, mode: voice ? "voice" : "typed" }));
      return true;
    } catch (err) {
      setSpeakError(err instanceof Error ? err.message : "Couldn't send your answer.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    if (!challenge || busy) return;
    setBusy(true);
    try {
      setChallenge(await api.speakChallenge(challenge.id, { skip: true }));
    } catch (err) {
      setSpeakError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <>
        <FocusBar onClose={onClose} />
        <Centered>
          <p className="text-[17px] font-semibold text-ink">We couldn&apos;t start your challenge</p>
          <p className="mt-1 text-sm text-muted">{error}</p>
          <PrimaryButton
            onClick={() => {
              setError(null);
              load();
            }}
            className="mt-6 w-full max-w-xs"
          >
            Try again
          </PrimaryButton>
        </Centered>
      </>
    );
  }

  if (!challenge) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoaderCircle className="size-7 animate-spin text-accent" aria-label="Loading" />
      </div>
    );
  }

  if (challenge.kind === "placement" && !started && challenge.status === "quiz") {
    return <PlacementIntro rounds={challenge.quiz?.total ?? 8} onStart={() => setStarted(true)} onClose={onClose} />;
  }

  if (challenge.status === "quiz" && challenge.quiz?.current) {
    return (
      <WarmUp
        test={challenge}
        onAnswer={(choice) => api.answerChallenge(challenge.id, choice)}
        onAdvance={setChallenge}
        onClose={onClose}
      />
    );
  }

  if (challenge.status === "speaking" && challenge.speaking) {
    return (
      <ChatRound
        question={challenge.speaking.prompt}
        topic="Speaking"
        done={challenge.quiz?.total ?? 5}
        total={(challenge.quiz?.total ?? 5) + 1}
        label="Last step"
        busy={busy}
        error={speakError}
        onAnswer={speak}
        onClose={onClose}
        footer={
          <button
            type="button"
            onClick={() => void skip()}
            disabled={busy}
            className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-50"
          >
            Can&apos;t speak right now? Skip this one
          </button>
        }
      />
    );
  }

  if (challenge.status === "completed" && challenge.result) {
    return challenge.kind === "placement" ? (
      <PlacementDone result={challenge.result} onClose={onClose} onLevelCheck={onLevelCheck} />
    ) : (
      <DailyDone challenge={challenge} result={challenge.result} onClose={onClose} onAgain={again} />
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <LoaderCircle className="size-7 animate-spin text-accent" aria-label="Loading" />
    </div>
  );
}

function PlacementIntro({ rounds, onStart, onClose }: { rounds: number; onStart: () => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") onStart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStart]);

  return (
    <>
      <FocusBar onClose={onClose} closeLabel="Close" />
      <div className="flex min-h-0 flex-1 overflow-y-auto">
        <div className="m-auto w-full max-w-lg px-5 pt-4 pb-12">
          <div className="animate-in text-center">
            <p className="text-sm font-semibold text-accent">About 2 minutes</p>
            <h1 className="mt-2 text-[34px] leading-[1.1] font-bold tracking-[-0.03em] text-ink">
              Let&apos;s find your level
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted">
              {rounds} short rounds that adapt as you answer. Get one right and the next gets harder.
            </p>
          </div>

          <LevelScan />

          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {INTRO_FORMATS.map(({ icon: Icon, title, sample }, i) => (
              <li
                key={title}
                className="animate-in flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 sm:flex-col sm:items-start sm:gap-2.5 sm:p-4"
                style={{ animationDelay: `${120 + i * 60}ms` }}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon className="size-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">{sample}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="animate-in mt-8 flex flex-col items-center" style={{ animationDelay: "320ms" }}>
            <PrimaryButton onClick={onStart} className="w-full sm:w-72">
              Start
              <ArrowRight className="size-4" />
            </PrimaryButton>
            <p className="mt-3 hidden text-xs text-subtle sm:block">
              or press <kbd className="kbd">Enter</kbd>
            </p>
            <p className="mt-4 max-w-xs text-center text-xs leading-relaxed text-subtle">
              No pressure. Wrong answers just help us find the right starting point for you.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

const INTRO_FORMATS = [
  { icon: PenLine, title: "Fill the gap", sample: "I've lived here ___ 2019." },
  { icon: Headphones, title: "Listen", sample: "Hear it, pick the word" },
  { icon: SpellCheck, title: "Spot the mistake", sample: "Right or wrong?" },
];

function LevelScan() {
  const [active, setActive] = useState(2);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % CEFR_LEVELS.length), 650);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="animate-in mt-8 rounded-3xl border border-line bg-surface px-5 pt-5 pb-4 sm:px-7"
      style={{ animationDelay: "60ms" }}
      aria-hidden
    >
      <div className="flex h-36 items-end justify-between gap-2 sm:gap-3">
        {CEFR_LEVELS.map((level, i) => {
          const on = i === active;
          return (
            <div key={level} className="flex flex-1 flex-col items-center gap-2">
              <span
                className={cn(
                  "rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-surface transition-[opacity,transform] duration-300",
                  on ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
                )}
              >
                You?
              </span>
              <span
                className={cn(
                  "w-full max-w-11 rounded-xl transition-colors duration-300",
                  on ? "bg-accent" : "bg-accent/15",
                )}
                style={{ height: 22 + i * 15 }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between gap-2 sm:gap-3">
        {CEFR_LEVELS.map((level, i) => (
          <span
            key={level}
            className={cn(
              "flex-1 text-center text-xs font-semibold transition-colors duration-300",
              i === active ? "text-accent" : "text-subtle",
            )}
          >
            {level}
          </span>
        ))}
      </div>
      <div className="mt-3 flex justify-between border-t border-line pt-3 text-[11px] text-subtle">
        <span>Beginner</span>
        <span>Fluent</span>
      </div>
    </div>
  );
}

function PlacementDone({
  result,
  onClose,
  onLevelCheck,
}: {
  result: ChallengeResult;
  onClose: () => void;
  onLevelCheck: () => void;
}) {
  const xp = useCountUp(result.xp, 900);
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <Confetti />
      <FocusBar onClose={onClose} />
      <Centered>
        <div className="animate-in">
          <p className="text-sm font-semibold text-muted">You&apos;re around</p>
          <div className="mt-4 flex justify-center">
            <LevelBadge level={result.level_after} size="xl" />
          </div>
          <h1 className="mt-6 text-[30px] leading-tight font-bold tracking-[-0.025em] text-ink">
            {LEVEL_NAMES[result.level_after]}
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            {result.correct} of {result.total} right · <span className="font-semibold text-ink">+{xp} XP</span> ·{" "}
            <span className="font-semibold" style={{ color: FLAME }}>
              Day 1 streak
            </span>
          </p>

          <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-line bg-surface p-5 text-left">
            <p className="text-sm font-semibold text-ink">Your plan from here</p>
            <ul className="mt-3 space-y-3 text-sm text-muted">
              <li className="flex gap-3">
                <Flame className="mt-0.5 size-4 shrink-0" style={{ color: FLAME }} />
                Do a 2-minute challenge every day to keep your streak and sharpen your level.
              </li>
              <li className="flex gap-3">
                <Award className="mt-0.5 size-4 shrink-0 text-accent" />
                Take the full level check (with a short chat) to certify your level.
              </li>
            </ul>
          </div>

          <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3">
            <PrimaryButton onClick={onClose}>Start practising</PrimaryButton>
            <SecondaryButton onClick={onLevelCheck}>Take the full level check</SecondaryButton>
          </div>
        </div>
      </Centered>
    </div>
  );
}

function DailyDone({
  challenge,
  result,
  onClose,
  onAgain,
}: {
  challenge: Challenge;
  result: ChallengeResult;
  onClose: () => void;
  onAgain: () => void;
}) {
  const xp = useCountUp(result.xp, 900);
  const streak = useCountUp(
    result.streak,
    700,
    result.streak_extended ? Math.max(0, result.streak - 1) : result.streak,
  );
  const levelUp = CEFR_LEVELS.indexOf(result.level_after) > CEFR_LEVELS.indexOf(result.level_before);
  const delta = result.rating_after - result.rating_before;
  const next = CEFR_LEVELS[CEFR_LEVELS.indexOf(result.level_after) + 1];
  const celebrate = result.goal_reached || result.new_badges.length > 0 || levelUp || result.streak_extended;
  const speaking = challenge.speaking;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {celebrate && <Confetti />}
      <FocusBar onClose={onClose} closeLabel="Close" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-xl px-5 pt-6 pb-12">
          <div className="animate-in text-center">
            <p className="text-sm font-semibold text-muted">
              {levelUp ? "Level up!" : result.correct === result.total ? "Flawless!" : "Challenge complete"}
            </p>
            <p className="mt-2 text-[56px] leading-none font-bold tracking-[-0.03em] text-ink tabular-nums">+{xp}</p>
            <p className="mt-1 text-sm font-semibold text-muted">XP earned</p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <div
              className="animate-in flex items-center gap-3 rounded-2xl border border-line bg-surface p-4"
              style={{ animationDelay: "80ms" }}
            >
              <span
                className="flex size-11 items-center justify-center rounded-2xl text-white"
                style={{ background: FLAME }}
              >
                <Flame className="size-6" />
              </span>
              <div>
                <p className="text-2xl leading-none font-bold text-ink tabular-nums">{streak}</p>
                <p className="mt-1 text-xs text-muted">{result.streak_extended ? "Streak +1" : "day streak"}</p>
              </div>
            </div>
            <div
              className="animate-in flex items-center gap-3 rounded-2xl border border-line bg-surface p-4"
              style={{ animationDelay: "140ms" }}
            >
              <GoalRing
                value={result.today_xp}
                goal={result.goal}
                size={46}
                stroke={6}
                animateFrom={result.today_xp - result.xp}
              >
                {result.today_xp >= result.goal && <Check className="size-4 text-success" strokeWidth={3} />}
              </GoalRing>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {result.today_xp >= result.goal ? "Goal reached" : `${result.goal - result.today_xp} XP to go`}
                </p>
                <p className="mt-0.5 text-xs text-muted tabular-nums">
                  {result.today_xp} / {result.goal} XP today
                </p>
              </div>
            </div>
          </div>

          <div
            className="animate-in mt-3 rounded-2xl border border-line bg-surface p-4"
            style={{ animationDelay: "200ms" }}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-semibold text-ink">
                <LevelBadge level={result.level_after} size="sm" />
                {LEVEL_NAMES[result.level_after]}
              </span>
              <span className={cn("text-xs font-semibold", delta >= 0 ? "text-success" : "text-muted")}>
                {delta >= 0 ? `+${delta}` : delta} level points
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-hover">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-1000"
                style={{ width: `${Math.max(4, result.band_progress * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {next ? `${Math.round(result.band_progress * 100)}% of the way to ${next}` : "You're at the top level"}
            </p>
          </div>

          {result.new_badges.length > 0 && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {result.new_badges.map((badge, i) => {
                const Icon = BADGE_ICONS[badge.id] ?? Sparkles;
                return (
                  <div
                    key={badge.id}
                    className="animate-in flex items-center gap-3 rounded-2xl border border-[#f59e0b]/40 bg-[#f59e0b]/8 p-4"
                    style={{ animationDelay: `${260 + i * 80}ms` }}
                  >
                    <span className="flex size-11 items-center justify-center rounded-full bg-[#f59e0b] text-white">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#b45309]">New badge</p>
                      <p className="truncate text-sm font-semibold text-ink">{badge.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {speaking?.answer && (
            <div
              className="animate-in mt-3 rounded-2xl border border-line bg-surface p-4"
              style={{ animationDelay: "320ms" }}
            >
              <p className="flex items-center gap-2 text-xs font-semibold text-muted">
                <Mic className="size-3.5" />
                Your speaking answer
              </p>
              <p className="mt-2 text-xs text-subtle">{speaking.prompt}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{speaking.answer}</p>
              {speaking.improved && speaking.improved !== speaking.answer && (
                <p className="mt-2 rounded-xl bg-success/8 px-3 py-2 text-[15px] leading-relaxed text-ink">
                  <span className="mr-1.5 text-xs font-bold text-success">Better</span>
                  {speaking.improved}
                </p>
              )}
              {speaking.feedback && <p className="mt-2 text-sm text-muted">{speaking.feedback}</p>}
            </div>
          )}

          <div className="mt-4 rounded-2xl bg-hover/60 px-4 py-3">
            {result.breakdown.map((line) => (
              <div key={line.label} className="flex justify-between py-0.5 text-sm">
                <span className="text-muted">{line.label}</span>
                <span className="font-semibold text-ink tabular-nums">+{line.xp}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row-reverse">
            <PrimaryButton onClick={onClose} className="flex-1">
              Done
              <ArrowRight className="size-4" />
            </PrimaryButton>
            <SecondaryButton onClick={onAgain} className="flex-1">
              <Zap className="size-4" />
              One more round
            </SecondaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
