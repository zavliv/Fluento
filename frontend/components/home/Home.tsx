"use client";

import { ArrowRight, Check, Flame, MessageCircle, Play, Sparkles, Zap } from "lucide-react";
import { useMemo, useRef } from "react";
import type { CefrLevel, Progress } from "@/lib/api";
import { pickGuide, type Teacher } from "@/lib/teachers";
import type { Message } from "@/lib/types";
import { cn, messageText, shortTime } from "@/lib/utils";
import { TodayCard } from "../practice/TodayCard";
import { FLAME } from "../practice/visuals";
import { useSiteSettings } from "../SiteSettings";
import { TeacherAvatar } from "../TeacherAvatar";
import { TeacherGrid } from "../TeacherGrid";

type Props = {
  userName: string;
  teachers: Teacher[];
  myTeachers: Teacher[];
  myTeacherIds: string[];
  lastMessage: (teacherId: string) => Message | null;
  progress: Progress | null;
  tested: CefrLevel | null;
  onSelect: (teacherId: string) => void;
  onStartChallenge: () => void;
  onLevelCheck: () => void;
  onOpenProgress: () => void;
};

const LEVEL_FIT: Record<CefrLevel, string[]> = {
  A1: ["Beginner", "All levels"],
  A2: ["Beginner", "All levels", "Intermediate"],
  B1: ["Intermediate", "All levels"],
  B2: ["Intermediate", "Advanced", "All levels"],
  C1: ["Advanced", "All levels"],
  C2: ["Advanced", "All levels"],
};

function salutation() {
  const hour = new Date().getHours();
  if (hour < 5) return "Hello";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function recommend(teachers: Teacher[], myIds: string[], level: CefrLevel | null, fallbackId: string) {
  const fresh = teachers.filter((t) => !myIds.includes(t.id));
  if (!fresh.length) return null;
  if (!level) return { teacher: pickGuide(fresh, fallbackId) ?? fresh[0], reason: "A friendly first teacher" };
  const match =
    fresh.find((t) => LEVEL_FIT[level][0] === t.level) ?? fresh.find((t) => LEVEL_FIT[level].includes(t.level));
  return match
    ? { teacher: match, reason: `A good fit for your ${level} level` }
    : { teacher: fresh[0], reason: "Try a new skill" };
}

export function Home({
  userName,
  teachers,
  myTeachers,
  myTeacherIds,
  lastMessage,
  progress,
  tested,
  onSelect,
  onStartChallenge,
  onLevelCheck,
  onOpenProgress,
}: Props) {
  const { default_teacher_id } = useSiteSettings();
  const teachersRef = useRef<HTMLElement>(null);
  const first = userName.split(" ")[0];
  const level = progress?.placed ? progress.level : tested;
  const pick = useMemo(
    () => recommend(teachers, myTeacherIds, level, default_teacher_id),
    [teachers, myTeacherIds, level, default_teacher_id],
  );

  const steps = [
    { id: "level", done: Boolean(progress?.placed), title: "Find your level", text: "8 quick rounds · 2 minutes" },
    { id: "teacher", done: myTeacherIds.length > 0, title: "Meet your teacher", text: "Pick someone to chat with" },
    {
      id: "daily",
      done: (progress?.streak.current ?? 0) > 0,
      title: "Start your streak",
      text: "A 2-minute challenge each day",
    },
  ];
  const onboarding = progress?.enabled !== false && (!progress?.placed || myTeacherIds.length === 0);
  const current = steps.find((s) => !s.done)?.id;
  const streak = progress?.placed ? progress.streak : null;

  const scrollToTeachers = () => teachersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const recent = myTeachers
    .map((t) => ({ teacher: t, message: lastMessage(t.id) }))
    .sort((a, b) => (b.message?.createdAt ?? 0) - (a.message?.createdAt ?? 0))
    .slice(0, 3);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">
        <header className="animate-in flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-tight font-bold tracking-[-0.025em] text-ink md:text-[32px]">
              {salutation()}, {first}
            </h1>
            <p className="mt-1.5 text-[15px] text-muted">
              {onboarding
                ? "Let's get you set up. It takes about 5 minutes."
                : streak?.done_today
                  ? "You've practised today. Keep the conversation going."
                  : streak && streak.current > 0
                    ? `You're on a ${streak.current}-day streak. Keep it alive today.`
                    : "Ready for today's practice?"}
            </p>
          </div>
          {streak && streak.current > 0 && (
            <button
              type="button"
              onClick={onOpenProgress}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pr-3.5 pl-1.5 text-sm font-semibold text-ink transition-colors hover:border-accent/40"
            >
              <span
                className="flex size-7 items-center justify-center rounded-full text-white"
                style={{ background: FLAME }}
              >
                <Flame className="size-4" />
              </span>
              {streak.current} day{streak.current === 1 ? "" : "s"}
              <span className="font-normal text-muted">· {progress?.xp_week ?? 0} XP this week</span>
            </button>
          )}
        </header>

        <div className="@container mt-7">
          <div className={cn("grid gap-5", (onboarding || pick) && "@3xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]")}>
            {onboarding ? (
              <GetStarted
                steps={steps}
                current={current}
                onLevel={onStartChallenge}
                onTeacher={pick ? () => onSelect(pick.teacher.id) : scrollToTeachers}
                onDaily={onStartChallenge}
                teacherName={pick?.teacher.name}
              />
            ) : progress ? (
              <div className={cn(!pick && "@3xl:col-span-2")}>
                <TodayCard
                  progress={progress}
                  onStart={onStartChallenge}
                  onLevelCheck={onLevelCheck}
                  onOpenProgress={onOpenProgress}
                />
              </div>
            ) : (
              <div />
            )}
            {pick && <Recommended teacher={pick.teacher} reason={pick.reason} onSelect={onSelect} />}
          </div>
        </div>

        {recent.length > 0 && (
          <section className="@container mt-10">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[18px] font-bold tracking-[-0.015em] text-ink">Continue learning</h2>
              <span className="text-sm text-muted">{myTeachers.length} of your teachers</span>
            </div>
            <div className="mt-4 grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-3">
              {recent.map(({ teacher, message }) => (
                <button
                  key={teacher.id}
                  type="button"
                  onClick={() => onSelect(teacher.id)}
                  className="group flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-accent/40"
                >
                  <TeacherAvatar name={teacher.name} color={teacher.color} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[15px] font-semibold text-ink">{teacher.name}</span>
                      {message && <span className="shrink-0 text-xs text-subtle">{shortTime(message.createdAt)}</span>}
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted">
                      {message
                        ? `${message.role === "user" ? "You: " : ""}${messageText(message)}`
                        : `Say hello to ${teacher.name}`}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section ref={teachersRef} className="mt-10 scroll-mt-6">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-[18px] font-bold tracking-[-0.015em] text-ink">
              {myTeacherIds.length ? "Explore teachers" : "Choose a teacher"}
            </h2>
            <span className="text-sm text-muted">{teachers.length} teachers</span>
          </div>
          <TeacherGrid
            teachers={teachers}
            myTeacherIds={myTeacherIds}
            onSelect={onSelect}
            compact
            searchable
            showGuide={false}
          />
        </section>
      </div>
    </div>
  );
}

function GetStarted({
  steps,
  current,
  onLevel,
  onTeacher,
  onDaily,
  teacherName,
}: {
  steps: { id: string; done: boolean; title: string; text: string }[];
  current: string | undefined;
  onLevel: () => void;
  onTeacher: () => void;
  onDaily: () => void;
  teacherName?: string;
}) {
  const done = steps.filter((s) => s.done).length;
  const actions: Record<string, { label: string; run: () => void; icon: typeof Play }> = {
    level: { label: "Start quick check", run: onLevel, icon: Play },
    teacher: {
      label: teacherName ? `Say hi to ${teacherName}` : "Choose a teacher",
      run: onTeacher,
      icon: MessageCircle,
    },
    daily: { label: "Start today's challenge", run: onDaily, icon: Zap },
  };

  return (
    <section className="animate-in rounded-3xl border border-line bg-surface p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-accent">Get started</p>
          <h2 className="mt-0.5 text-[20px] font-bold tracking-[-0.02em] text-ink">Your first steps</h2>
        </div>
        <span className="text-sm font-semibold text-muted tabular-nums">
          {done} of {steps.length}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-hover">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-700"
          style={{ width: `${Math.max(4, (done / steps.length) * 100)}%` }}
        />
      </div>

      <ol className="mt-5 space-y-2">
        {steps.map((step, i) => {
          const active = step.id === current;
          const action = actions[step.id];
          const Icon = action.icon;
          return (
            <li
              key={step.id}
              className={cn("flex gap-4 rounded-2xl px-3 py-3 transition-colors", active && "bg-accent-soft")}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  step.done
                    ? "bg-success text-status-ink"
                    : active
                      ? "bg-accent text-accent-ink"
                      : "bg-hover text-subtle",
                )}
              >
                {step.done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className="min-w-0 flex-1 pt-0.5">
                <span
                  className={cn("block text-[15px] font-semibold", step.done ? "text-muted line-through" : "text-ink")}
                >
                  {step.title}
                </span>
                <span className="block text-sm text-muted">{step.text}</span>
                {active && (
                  <button
                    type="button"
                    onClick={action.run}
                    className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold whitespace-nowrap text-accent-ink transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]"
                  >
                    <Icon className={cn("size-4", Icon === Play && "fill-current")} />
                    {action.label}
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Recommended({
  teacher,
  reason,
  onSelect,
}: {
  teacher: Teacher;
  reason: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section
      className="animate-in relative flex flex-col overflow-hidden rounded-3xl border p-5 md:p-6"
      style={{
        animationDelay: "60ms",
        borderColor: `color-mix(in srgb, ${teacher.color} 30%, var(--line))`,
        background: `color-mix(in srgb, ${teacher.color} 6%, var(--surface))`,
      }}
    >
      <p className="flex flex-wrap items-center gap-x-1.5 text-xs font-semibold" style={{ color: teacher.color }}>
        <Sparkles className="size-3.5" />
        Recommended for you
        <span className="font-normal text-muted">· {reason}</span>
      </p>
      <div className="mt-4 flex items-center gap-3">
        <TeacherAvatar name={teacher.name} color={teacher.color} size={52} />
        <div className="min-w-0">
          <h2 className="text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">{teacher.name}</h2>
          <p className="text-sm font-semibold" style={{ color: teacher.color }}>
            {teacher.specialty}
          </p>
        </div>
      </div>
      <p className="mt-4 text-[15px] leading-relaxed text-ink">{teacher.tagline}</p>
      <blockquote
        className="mt-3 border-l-2 pl-3 text-sm leading-relaxed text-muted italic"
        style={{ borderColor: teacher.color }}
      >
        {teacher.quote}
      </blockquote>
      <span className="flex-1" />
      <div className="mt-5">
        <button
          type="button"
          onClick={() => onSelect(teacher.id)}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]"
          style={{ background: teacher.color }}
        >
          Talk to {teacher.name}
          <ArrowRight className="size-4" />
        </button>
      </div>
    </section>
  );
}
