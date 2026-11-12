"use client";

import { ArrowRight, Check, Flame, Play, Zap } from "lucide-react";
import { CEFR_LEVELS, LEVEL_NAMES, type Progress } from "@/lib/api";
import { cn } from "@/lib/utils";
import { FLAME, FreezeChip, GoalRing, WeekDots } from "./visuals";

type Props = {
  progress: Progress;
  onStart: () => void;
  onLevelCheck: () => void;
  onOpenProgress?: () => void;
  compact?: boolean;
};

export function TodayCard({ progress, onStart, onLevelCheck, onOpenProgress, compact }: Props) {
  if (!progress.enabled) return null;
  if (!progress.placed) return <QuickStartCard onStart={onStart} />;

  const { streak, today, check } = progress;
  const next = CEFR_LEVELS[CEFR_LEVELS.indexOf(progress.level) + 1];
  const goalDone = today.xp >= today.goal;

  return (
    <section className="@container animate-in overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="grid gap-px bg-line @lg:grid-cols-2 @4xl:grid-cols-[1fr_1.15fr_1fr]">
        <div className="flex flex-col gap-4 bg-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-2xl",
                  streak.current > 0 ? "text-white" : "bg-hover text-subtle",
                )}
                style={streak.current > 0 ? { background: FLAME } : undefined}
              >
                <Flame className="size-6" />
              </span>
              <div>
                <p className="text-[26px] leading-none font-bold tracking-[-0.02em] text-ink tabular-nums">
                  {streak.current}
                </p>
                <p className="mt-1 text-xs font-semibold text-muted">day streak</p>
              </div>
            </div>
            {streak.freezes > 0 && <FreezeChip count={streak.freezes} />}
          </div>
          <WeekDots calendar={progress.calendar} />
          <p className="text-xs text-muted">
            {streak.used_freeze_today
              ? "A streak freeze saved your streak yesterday."
              : streak.done_today
                ? "Streak safe for today. See you tomorrow!"
                : streak.current > 0
                  ? "Do today's challenge to keep your streak."
                  : "Start a streak with today's challenge."}
          </p>
        </div>

        <div className="flex items-center gap-5 bg-surface p-5">
          <GoalRing value={today.xp} goal={today.goal} size={88} stroke={9}>
            {goalDone ? (
              <Check className="size-7 text-success" strokeWidth={3} />
            ) : (
              <>
                <span className="text-lg font-bold text-ink tabular-nums">{today.xp}</span>
                <span className="mt-0.5 text-[10px] text-muted">/ {today.goal} XP</span>
              </>
            )}
          </GoalRing>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted">Today&apos;s challenge</p>
            <p className="mt-0.5 text-[15px] font-semibold text-ink">
              {streak.done_today ? (goalDone ? "Daily goal reached" : "Nice work today") : "5 rounds and 1 question"}
            </p>
            <button
              type="button"
              onClick={onStart}
              className={cn(
                "mt-3 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold whitespace-nowrap transition-[opacity,transform] active:scale-[0.98]",
                streak.done_today
                  ? "border border-line bg-surface text-ink hover:border-accent/40"
                  : "bg-accent text-accent-ink hover:opacity-90",
              )}
            >
              {streak.done_today ? <Zap className="size-4" /> : <Play className="size-4 fill-current" />}
              {streak.done_today ? "Practise again" : "Start · 2 min"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 bg-surface p-5 @lg:col-span-2 @4xl:col-span-1">
          <div className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-lg font-bold text-accent-ink">
              {progress.level}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-ink">{LEVEL_NAMES[progress.level]}</p>
              <p className="text-xs text-muted">
                {progress.official_level ? `Certified ${progress.official_level}` : "Estimated level"}
              </p>
            </div>
          </div>
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-hover">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-700"
                style={{ width: `${Math.max(4, progress.band_progress * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {next ? `${Math.round(progress.band_progress * 100)}% of the way to ${next}` : "Top level"}
            </p>
          </div>
          {check.available ? (
            <button
              type="button"
              onClick={onLevelCheck}
              className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-accent hover:underline"
            >
              {check.reason === "level_up"
                ? `Ready for ${progress.level}? Take the level check`
                : "Take your level check"}
              <ArrowRight className="size-4" />
            </button>
          ) : (
            !compact &&
            onOpenProgress && (
              <button
                type="button"
                onClick={onOpenProgress}
                className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-muted hover:text-ink"
              >
                See your progress
                <ArrowRight className="size-4" />
              </button>
            )
          )}
        </div>
      </div>
    </section>
  );
}

function QuickStartCard({ onStart }: { onStart: () => void }) {
  return (
    <section className="animate-in flex flex-col items-center gap-6 rounded-3xl border border-line bg-surface p-6 sm:flex-row md:p-7">
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <p className="text-xs font-semibold text-accent">2 minutes · no pressure</p>
        <h2 className="mt-1.5 text-[22px] leading-tight font-bold tracking-[-0.02em] text-ink">
          Find your English level
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          8 quick rounds that adapt to you. Then a 2-minute challenge each day keeps your streak going and sharpens your
          level.
        </p>
        <button
          type="button"
          onClick={onStart}
          className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-[15px] font-semibold text-accent-ink transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]"
        >
          <Play className="size-4 fill-current" />
          Start quick check
        </button>
      </div>
      <div className="flex shrink-0 items-end gap-1.5" aria-hidden>
        {CEFR_LEVELS.map((level, i) => (
          <div key={level} className="flex flex-col items-center gap-1.5">
            <span
              className={cn("w-7 rounded-lg", i === 2 ? "bg-accent" : "bg-accent/20")}
              style={{ height: 18 + i * 12 }}
            />
            <span className={cn("text-[10px] font-semibold", i === 2 ? "text-accent" : "text-subtle")}>{level}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
