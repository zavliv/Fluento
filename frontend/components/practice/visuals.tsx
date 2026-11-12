"use client";

import {
  Award,
  Flame,
  Footprints,
  Medal,
  Snowflake,
  Target,
  TrendingUp,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const BADGE_ICONS: Record<string, LucideIcon> = {
  first_challenge: Footprints,
  streak_3: Flame,
  streak_7: Flame,
  streak_30: Zap,
  perfect: Target,
  first_check: Award,
  level_up: TrendingUp,
  xp_1000: Trophy,
  league_top3: Medal,
};

export const FLAME = "#f97316";

export function useCountUp(target: number, duration = 900, from = 0) {
  const [value, setValue] = useState(from);
  const start = useRef<number | null>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(frame);
    }
    start.current = null;
    let frame = 0;
    const step = (time: number) => {
      start.current ??= time;
      const t = Math.min(1, (time - start.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, from]);
  return value;
}

export function GoalRing({
  value,
  goal,
  size = 76,
  stroke = 8,
  animateFrom,
  children,
}: {
  value: number;
  goal: number;
  size?: number;
  stroke?: number;
  animateFrom?: number;
  children?: React.ReactNode;
}) {
  const shown = useCountUp(value, 1000, animateFrom ?? value);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(1, goal ? shown / goal : 0);
  const done = value >= goal;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-hover" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          className={done ? "stroke-success" : "stroke-accent"}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">{children}</div>
    </div>
  );
}

export function WeekDots({ calendar }: { calendar: { day: string; xp: number }[] }) {
  const days = calendar.slice(-7);
  return (
    <div className="flex gap-1.5" aria-label="Last 7 days">
      {days.map((d, i) => {
        const label = new Date(`${d.day}T12:00:00`).toLocaleDateString([], { weekday: "narrow" });
        const today = i === days.length - 1;
        return (
          <div key={d.day} className="flex flex-col items-center gap-1">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full",
                d.xp > 0 ? "text-white" : today ? "border-2 border-dashed border-line" : "bg-hover",
              )}
              style={d.xp > 0 ? { background: FLAME } : undefined}
              title={`${d.day}: ${d.xp} XP`}
            >
              {d.xp > 0 && <Flame className="size-3.5" />}
            </span>
            <span className={cn("text-[10px]", today ? "font-bold text-ink" : "text-subtle")}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function FreezeChip({ count }: { count: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-[#0ea5e9]/12 px-2 py-0.5 text-xs font-semibold text-[#0284c7]"
      title="Streak freezes protect your streak if you miss a day"
    >
      <Snowflake className="size-3.5" />
      {count}
    </span>
  );
}
