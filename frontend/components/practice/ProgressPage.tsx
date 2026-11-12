"use client";

import { ArrowRight, Award, Crown, Flame, Lock, Medal, Snowflake, Trophy, Users, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api, CEFR_LEVELS, LEVEL_NAMES, type League, type Progress } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "../ui/Toast";
import { TodayCard } from "./TodayCard";
import { BADGE_ICONS, FLAME } from "./visuals";

type Props = {
  progress: Progress | null;
  onStart: () => void;
  onLevelCheck: () => void;
  onRefresh: () => void;
};

function daysUntil(value: string | null) {
  if (!value) return 0;
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000));
}

export function ProgressPage({ progress, onStart, onLevelCheck, onRefresh }: Props) {
  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  if (!progress) {
    return <div className="flex-1" />;
  }

  const stats = [
    {
      label: "Day streak",
      value: progress.streak.current,
      sub: `Best ${progress.streak.best}`,
      icon: Flame,
      color: FLAME,
    },
    { label: "XP this week", value: progress.xp_week, sub: "Resets Monday", icon: Zap, color: "#eab308" },
    {
      label: "Total XP",
      value: progress.xp_total,
      sub: `${progress.badges.length} badges`,
      icon: Trophy,
      color: "#8b5cf6",
    },
    {
      label: "Streak freezes",
      value: progress.streak.freezes,
      sub: `${progress.streak.freeze_every - progress.streak.freeze_progress} days to the next`,
      icon: Snowflake,
      color: "#0ea5e9",
    },
  ];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 md:px-6">
        <div>
          <TodayCard progress={progress} onStart={onStart} onLevelCheck={onLevelCheck} compact />
        </div>

        {progress.placed && (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              {stats.map(({ label, value, sub, icon: Icon, color }) => (
                <div key={label} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted">
                    <Icon className="size-4" style={{ color }} />
                    {label}
                  </div>
                  <p className="mt-2 text-[26px] leading-none font-bold tracking-[-0.02em] text-ink tabular-nums">
                    {value.toLocaleString()}
                  </p>
                  <p className="mt-1.5 text-xs text-subtle">{sub}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
              <LevelPanel progress={progress} onLevelCheck={onLevelCheck} />
              <Calendar progress={progress} />
            </div>

            <Badges progress={progress} />
            {progress.league_enabled && <LeaguePanel />}
          </>
        )}
      </div>
    </div>
  );
}

function LevelPanel({ progress, onLevelCheck }: { progress: Progress; onLevelCheck: () => void }) {
  const next = CEFR_LEVELS[CEFR_LEVELS.indexOf(progress.level) + 1];
  const { check } = progress;
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-[15px] font-semibold text-ink">Your level</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-hover/60 p-3">
          <p className="text-xs text-muted">Certified</p>
          <p className="mt-1 text-xl font-bold text-ink">{progress.official_level ?? "—"}</p>
          <p className="text-xs text-subtle">
            {progress.official_level ? LEVEL_NAMES[progress.official_level] : "Not tested yet"}
          </p>
        </div>
        <div className="rounded-xl bg-accent-soft p-3">
          <p className="text-xs text-accent">Daily estimate</p>
          <p className="mt-1 text-xl font-bold text-ink">{progress.level}</p>
          <p className="text-xs text-muted">{LEVEL_NAMES[progress.level]}</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-muted">
          <span>{next ? `Progress to ${next}` : "Top level"}</span>
          <span className="font-semibold text-ink">{Math.round(progress.band_progress * 100)}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-hover">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${Math.max(4, progress.band_progress * 100)}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between text-xs text-muted">
          <span>How sure we are</span>
          <span className="font-semibold text-ink">{Math.round(progress.confidence * 100)}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-hover">
          <div
            className="h-full rounded-full bg-ink/40"
            style={{ width: `${Math.max(4, progress.confidence * 100)}%` }}
          />
        </div>
      </div>
      <div className="mt-5 border-t border-line pt-4">
        {check.available ? (
          <button
            type="button"
            onClick={onLevelCheck}
            className="flex w-full items-center gap-3 rounded-xl bg-accent px-4 py-3 text-left text-accent-ink transition-opacity hover:opacity-90"
          >
            <Award className="size-5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {check.reason === "level_up" ? `Ready to certify ${progress.level}?` : "Level check available"}
              </span>
              <span className="block text-xs opacity-80">Warm-up and a short chat · about 6 minutes</span>
            </span>
            <ArrowRight className="size-4" />
          </button>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Award className="size-4 text-subtle" />
            Next level check in {daysUntil(check.next_at)} {daysUntil(check.next_at) === 1 ? "day" : "days"}
          </p>
        )}
      </div>
    </section>
  );
}

function Calendar({ progress }: { progress: Progress }) {
  const goal = progress.today.goal;
  const days = progress.calendar;
  const first = new Date(`${days[0].day}T12:00:00`);
  const offset = (first.getDay() + 6) % 7;
  const cells: ({ day: string; xp: number } | null)[] = [...Array(offset).fill(null), ...days];
  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const active = days.filter((d) => d.xp > 0).length;

  const shade = (xp: number) => (xp <= 0 ? 0 : xp < goal / 2 ? 1 : xp < goal ? 2 : 3);

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold text-ink">Last 8 weeks</h2>
        <span className="text-xs text-muted">{active} active days</span>
      </div>
      <div className="mt-4 flex gap-1.5">
        <div className="flex flex-col gap-1.5 pr-1 text-[10px] text-subtle">
          {["M", "", "W", "", "F", "", "S"].map((d, i) => (
            <span key={i} className="flex h-5 items-center">
              {d}
            </span>
          ))}
        </div>
        {weeks.map((week, w) => (
          <div key={w} className="flex flex-1 flex-col gap-1.5">
            {Array.from({ length: 7 }, (_, i) => week[i] ?? null).map((cell, i) => (
              <span
                key={i}
                title={cell ? `${cell.day}: ${cell.xp} XP` : undefined}
                className={cn(
                  "h-5 rounded-[5px]",
                  !cell && "bg-transparent",
                  cell && shade(cell.xp) === 0 && "bg-hover",
                )}
                style={
                  cell && shade(cell.xp) > 0
                    ? { background: FLAME, opacity: [0, 0.35, 0.65, 1][shade(cell.xp)] }
                    : undefined
                }
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-subtle">
        Less
        {[0, 0.35, 0.65, 1].map((o) => (
          <span
            key={o}
            className={cn("size-3 rounded-[3px]", o === 0 && "bg-hover")}
            style={o ? { background: FLAME, opacity: o } : undefined}
          />
        ))}
        More
      </div>
    </section>
  );
}

function Badges({ progress }: { progress: Progress }) {
  const earned = new Map(progress.badges.map((b) => [b.id, b]));
  return (
    <section className="mt-5 rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold text-ink">Badges</h2>
        <span className="text-xs text-muted">
          {progress.badges.length} of {progress.catalog.length}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {progress.catalog.map((badge) => {
          const got = earned.get(badge.id);
          const Icon = BADGE_ICONS[badge.id] ?? Award;
          return (
            <div
              key={badge.id}
              className={cn(
                "flex flex-col items-center rounded-2xl p-3 text-center",
                got ? "bg-[#f59e0b]/8" : "bg-hover/50",
              )}
              title={badge.description}
            >
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-full",
                  got ? "bg-[#f59e0b] text-white" : "bg-hover text-subtle",
                )}
              >
                {got ? <Icon className="size-6" /> : <Lock className="size-5" />}
              </span>
              <p className={cn("mt-2 text-xs font-semibold", got ? "text-ink" : "text-muted")}>{badge.name}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-subtle">{badge.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LeaguePanel() {
  const toast = useToast();
  const [league, setLeague] = useState<League | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api
      .league()
      .then(setLeague)
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (optIn: boolean) => {
    setSaving(true);
    try {
      setLeague(await api.setLeague(optIn));
      toast({ message: optIn ? "You've joined this week's league" : "You've left the league" });
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Couldn't update the league" });
    } finally {
      setSaving(false);
    }
  };

  if (!league) return null;
  const ends = daysUntil(league.ends_at);

  return (
    <section className="mt-5 rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <Crown className="size-4 text-[#eab308]" />
            Weekly league
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Ranked by XP this week · ends in {ends} {ends === 1 ? "day" : "days"}
          </p>
        </div>
        {league.opt_in && (
          <button
            type="button"
            onClick={() => void toggle(false)}
            disabled={saving}
            className="text-xs font-semibold text-muted hover:text-ink"
          >
            Leave league
          </button>
        )}
      </div>

      {!league.opt_in ? (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-hover/50 px-5 py-6 text-center">
          <Users className="size-7 text-muted" />
          <p className="max-w-sm text-sm text-muted">
            Compete with other learners on weekly XP. Only your first name and initial are shown, and you can leave any
            time.
          </p>
          <button
            type="button"
            onClick={() => void toggle(true)}
            disabled={saving}
            className="h-10 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-ink hover:opacity-90 disabled:opacity-60"
          >
            Join this week&apos;s league
          </button>
        </div>
      ) : league.entries.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-hover/50 px-5 py-6 text-center text-sm text-muted">
          No one has earned XP this week yet. Finish a challenge to take the lead.
        </p>
      ) : (
        <ol className="mt-4 divide-y divide-line">
          {league.entries.map((entry) => (
            <li
              key={`${entry.rank}-${entry.name}`}
              className={cn("flex items-center gap-3 px-2 py-2.5", entry.me && "rounded-xl bg-accent-soft")}
            >
              <span className="flex w-7 justify-center">
                {entry.rank <= 3 ? (
                  <Medal className="size-5" style={{ color: ["#eab308", "#94a3b8", "#c2410c"][entry.rank - 1] }} />
                ) : (
                  <span className="text-sm font-semibold text-muted tabular-nums">{entry.rank}</span>
                )}
              </span>
              <span className={cn("min-w-0 flex-1 truncate text-sm", entry.me ? "font-bold text-ink" : "text-ink")}>
                {entry.name}
                {entry.me && <span className="ml-1.5 text-xs font-normal text-muted">(you)</span>}
              </span>
              <span className="text-sm font-semibold text-ink tabular-nums">{entry.xp} XP</span>
            </li>
          ))}
          {league.me && !league.entries.some((e) => e.me) && (
            <li className="flex items-center gap-3 rounded-xl bg-accent-soft px-2 py-2.5">
              <span className="w-7 text-center text-sm font-semibold text-muted">{league.me.rank}</span>
              <span className="flex-1 text-sm font-bold text-ink">{league.me.name} (you)</span>
              <span className="text-sm font-semibold text-ink">{league.me.xp} XP</span>
            </li>
          )}
        </ol>
      )}
    </section>
  );
}
