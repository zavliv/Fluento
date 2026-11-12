"use client";

import {
  ArrowRight,
  Check,
  Crosshair,
  Gauge,
  LoaderCircle,
  MessageCircle,
  Play,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, type CefrLevel, type LearnerGoal, type Progress, type Recommendation } from "@/lib/api";
import type { Teacher } from "@/lib/teachers";
import { cn } from "@/lib/utils";
import { TodayCard } from "../practice/TodayCard";
import { TeacherAvatar } from "../TeacherAvatar";
import { TeacherGrid } from "../TeacherGrid";

type Props = {
  teachers: Teacher[];
  myTeacherIds: string[];
  progress: Progress | null;
  tested: CefrLevel | null;
  onSelect: (teacherId: string) => void;
  onStartChallenge: () => void;
  onLevelCheck: () => void;
  onOpenProgress: () => void;
};

function salutation() {
  const hour = new Date().getHours();
  if (hour < 5) return "Hello";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function homeHeading(name: string, progress: Progress | null, hasTeachers: boolean) {
  const first = name.split(" ")[0];
  const streak = progress?.placed ? progress.streak : null;
  const onboarding = progress?.enabled !== false && (!progress?.placed || !hasTeachers);
  return {
    title: `${salutation()}, ${first}`,
    subtitle: onboarding
      ? "Let's get you set up. It takes about 5 minutes."
      : streak?.done_today
        ? "You've practised today. Keep the conversation going."
        : streak && streak.current > 0
          ? `You're on a ${streak.current}-day streak. Keep it alive today.`
          : "Ready for today's practice?",
  };
}

const GOAL_DISMISSED = "fluento:goal-dismissed";

function readDismissed() {
  try {
    return localStorage.getItem(GOAL_DISMISSED) === "1";
  } catch {
    return false;
  }
}

export function Home({
  teachers,
  myTeacherIds,
  progress,
  tested,
  onSelect,
  onStartChallenge,
  onLevelCheck,
  onOpenProgress,
}: Props) {
  const teachersRef = useRef<HTMLElement>(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const teacherKey = myTeacherIds.join(",");
  const levelKey = progress?.placed ? progress.level : tested;
  const practiceKey = progress?.today.xp ?? 0;

  useEffect(() => {
    queueMicrotask(() => setDismissed(readDismissed()));
  }, []);

  useEffect(() => {
    let alive = true;
    api
      .recommendation()
      .then((r) => alive && setRec(r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [teacherKey, levelKey, practiceKey]);

  const pickTeacher = rec?.teacher_id ? teachers.find((t) => t.id === rec.teacher_id) : undefined;
  const pick = rec && pickTeacher ? { teacher: pickTeacher, rec } : null;

  const chooseGoal = async (goal: LearnerGoal) => {
    const next = await api.setGoal(goal);
    setRec(next);
    setEditingGoal(false);
  };

  const dismissGoal = () => {
    setDismissed(true);
    try {
      localStorage.setItem(GOAL_DISMISSED, "1");
    } catch {}
  };

  const showGoalRow = Boolean(rec) && (editingGoal || (!rec?.goal && !dismissed));

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

  const scrollToTeachers = () => teachersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 md:px-6">
        {showGoalRow && rec && (
          <GoalRow
            rec={rec}
            editing={editingGoal}
            onChoose={chooseGoal}
            onCancel={() => setEditingGoal(false)}
            onDismiss={dismissGoal}
          />
        )}

        <div className={cn("@container", showGoalRow && "mt-4")}>
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
                  className="h-full"
                />
              </div>
            ) : (
              <div />
            )}
            {pick && (
              <Recommended
                teacher={pick.teacher}
                rec={pick.rec}
                onSelect={onSelect}
                onEditGoal={() => setEditingGoal(true)}
                editingGoal={showGoalRow}
              />
            )}
          </div>
        </div>

        <section ref={teachersRef} className="mt-8 scroll-mt-6">
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

function GoalRow({
  rec,
  editing,
  onChoose,
  onCancel,
  onDismiss,
}: {
  rec: Recommendation;
  editing: boolean;
  onChoose: (goal: LearnerGoal) => Promise<void>;
  onCancel: () => void;
  onDismiss: () => void;
}) {
  const [saving, setSaving] = useState<LearnerGoal | null>(null);

  const choose = async (goal: LearnerGoal) => {
    setSaving(goal);
    try {
      await onChoose(goal);
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="animate-in rounded-2xl border border-line bg-surface px-4 py-3.5">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Target className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            {editing && rec.goal ? "Change your goal" : "What do you want English for?"}
          </p>
          <p className="text-xs text-muted">We&apos;ll match you with the right teacher.</p>
        </div>
        <button
          type="button"
          onClick={editing ? onCancel : onDismiss}
          className="h-8 shrink-0 px-2 text-[13px] text-muted hover:text-ink"
        >
          {editing ? "Cancel" : "Not now"}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 sm:pl-12">
        {rec.goal_options.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={saving !== null}
            onClick={() => void choose(option.id)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors disabled:opacity-60",
              option.id === rec.goal
                ? "border-accent bg-accent-soft text-accent"
                : "border-line text-ink hover:border-accent/50 hover:bg-accent-soft/40",
            )}
          >
            {saving === option.id && <LoaderCircle className="size-3.5 animate-spin" />}
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}

const REASON_ICONS = { goal: Target, weak: Crosshair, level: Gauge, default: Sparkles };

function Recommended({
  teacher,
  rec,
  onSelect,
  onEditGoal,
  editingGoal,
}: {
  teacher: Teacher;
  rec: Recommendation;
  onSelect: (id: string) => void;
  onEditGoal: () => void;
  editingGoal: boolean;
}) {
  const goalLabel = rec.goal_options.find((g) => g.id === rec.goal)?.label;

  return (
    <section
      className="animate-in flex flex-col overflow-hidden rounded-3xl border"
      style={{
        animationDelay: "60ms",
        borderColor: `color-mix(in srgb, ${teacher.color} 30%, var(--line))`,
        background: `color-mix(in srgb, ${teacher.color} 6%, var(--surface))`,
      }}
    >
      <div key={teacher.id} className="animate-in flex flex-1 flex-col p-5">
        <div className="flex items-center gap-3">
          <TeacherAvatar name={teacher.name} color={teacher.color} size={44} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: teacher.color }}>
              <Sparkles className="size-3" />
              Recommended for you
            </p>
            <h2 className="truncate text-[17px] leading-tight font-bold tracking-[-0.015em] text-ink">
              {teacher.name}
              <span className="font-medium text-muted"> · {teacher.specialty}</span>
            </h2>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">{teacher.tagline}</p>

        <ul className="mt-3 space-y-2">
          {rec.reasons.map((reason) => {
            const Icon = REASON_ICONS[reason.kind];
            return (
              <li key={reason.kind} className="flex gap-2.5 text-sm">
                <Icon className="mt-0.5 size-4 shrink-0" style={{ color: teacher.color }} />
                <span className="min-w-0">
                  <span className="text-ink">{reason.text}</span>
                  {reason.detail && <span className="block text-xs text-muted">{reason.detail}</span>}
                </span>
              </li>
            );
          })}
        </ul>

        <span className="flex-1" />
        <button
          type="button"
          onClick={() => onSelect(teacher.id)}
          className="mt-4 inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl px-4 text-sm font-semibold text-white transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]"
          style={{ background: teacher.color }}
        >
          Talk to {teacher.name}
          <ArrowRight className="size-4" />
        </button>
      </div>

      {!editingGoal && (
        <div className="flex items-center justify-between gap-3 border-t border-line/70 px-5 py-2.5 text-[13px]">
          <span className="flex min-w-0 items-center gap-2 text-muted">
            <Target className="size-3.5 shrink-0" />
            <span className="truncate">
              {goalLabel ? (
                <>
                  Your goal: <span className="font-semibold text-ink">{goalLabel}</span>
                </>
              ) : (
                "No goal set yet"
              )}
            </span>
          </span>
          <button type="button" onClick={onEditGoal} className="shrink-0 font-semibold text-accent hover:underline">
            {goalLabel ? "Change" : "Set goal"}
          </button>
        </div>
      )}
    </section>
  );
}
