"use client";

import {
  ArrowRight,
  Briefcase,
  Check,
  Languages,
  Mic,
  Monitor,
  Moon,
  SpellCheck,
  Sun,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import type { Theme } from "@/hooks/useTheme";
import type { User } from "@/lib/api";
import { listJoin, lowerFirst } from "@/lib/site";
import { GOALS, otherLanguages, pickGuide, type Teacher } from "@/lib/teachers";
import { IconButton } from "../IconButton";
import { useSiteSettings } from "../SiteSettings";
import { TeacherGrid } from "../TeacherGrid";
import { Wordmark } from "../Wordmark";
import { ConversationPreview } from "./ConversationPreview";

type Props = {
  teachers: Teacher[];
  user: User | null;
  onSelect: (teacherId: string) => void;
  onLogout: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
};

type Feature = { icon: LucideIcon; title: string; text: string };

function landingCopy(teachers: Teacher[]) {
  const goals = GOALS.filter((g) => teachers.some((t) => t.goals.includes(g.id))).map((g) => g.label.toLowerCase());
  const steps = [
    {
      title: "Pick a teacher",
      text: goals.length
        ? `Choose a teacher for your goal: ${listJoin(goals)}.`
        : "Choose the teacher whose style and specialty suit you.",
    },
    { title: "Talk or type", text: "Say anything in your own words. Tap the mic and your speech appears as you talk." },
    {
      title: "Learn from every reply",
      text: "Your teacher answers naturally, fixes mistakes gently, and keeps you talking.",
    },
  ];

  const features: Feature[] = [
    {
      icon: Mic,
      title: "Speak, don't just type",
      text: "Practise out loud with live voice input, and hear replies read back to you.",
    },
    {
      icon: SpellCheck,
      title: "Corrections that stick",
      text: "Every fix comes with the reason, so you stop repeating the same mistake.",
    },
  ];
  const helper = teachers.find((t) => otherLanguages(t).length > 0);
  const helperLanguages = helper ? otherLanguages(helper) : [];
  if (helper) {
    features.push({
      icon: Languages,
      title: `${helperLanguages[0]} help when stuck`,
      text: `${helper.name} explains tricky points in ${listJoin(helperLanguages, "or")}, then guides you back to English.`,
    });
  }
  const specialists = teachers.filter((t) => t.goals.includes("work") || t.goals.includes("exams"));
  features.push(
    specialists.length
      ? {
          icon: Briefcase,
          title: "Ready for real life",
          text: `Prepare with teachers who specialise in ${listJoin(specialists.map((t) => lowerFirst(t.specialty)))}.`,
        }
      : {
          icon: Briefcase,
          title: "A teacher for every goal",
          text: "Each teacher has their own specialty, so you can practise exactly what you need.",
        },
  );

  const points = [
    "Speak or type",
    "Instant, gentle corrections",
    helper ? `${helperLanguages[0]} help when you need it` : "Practise any time",
  ];
  return { steps, features, points };
}

const NEXT_THEME: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };

export function LandingPage({ teachers, user, onSelect, onLogout, theme, onThemeChange }: Props) {
  const { app_name, default_teacher_id, signup_enabled } = useSiteSettings();
  const guide = pickGuide(teachers, default_teacher_id);
  const { steps, features, points } = useMemo(() => landingCopy(teachers), [teachers]);
  const onlineCount = teachers.filter((t) => t.online).length;
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="h-dvh overflow-y-auto scroll-smooth bg-bg text-ink">
      <nav className="sticky top-0 z-20 border-b border-line/70 bg-bg/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:px-8">
          <Wordmark />
          <div className="hidden items-center gap-1 text-sm text-muted md:flex">
            {[
              ["teachers", "Teachers"],
              ["how-it-works", "How it works"],
              ["why-us", `Why ${app_name}`],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollTo(id)}
                className="rounded-lg px-3 py-1.5 transition-colors hover:bg-hover hover:text-ink"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <IconButton label={`Theme: ${theme}`} tooltip="bottom" onClick={() => onThemeChange(NEXT_THEME[theme])}>
              <ThemeIcon />
            </IconButton>
            {user ? (
              <>
                <span className="hidden text-sm text-muted sm:inline">Hi, {user.name.split(" ")[0]}</span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="h-9 rounded-xl border border-line px-4 text-sm font-semibold text-ink transition-colors hover:border-accent/40"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="h-9 rounded-xl px-3 text-sm leading-9 font-semibold text-ink hover:bg-hover"
                >
                  Log in
                </Link>
                {signup_enabled && (
                  <Link
                    href="/signup"
                    className="h-9 rounded-xl bg-ink px-4 text-sm leading-9 font-semibold text-bg transition-opacity hover:opacity-90"
                  >
                    Sign up free
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </nav>

      <header className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <div className="animate-in">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-muted">
            <span className="size-1.5 rounded-full bg-success" />
            {teachers.length} AI English teachers
            {onlineCount === teachers.length ? ", online now" : `, ${onlineCount} online now`}
          </span>
          <h1 className="mt-5 text-[40px] leading-[1.05] font-bold tracking-[-0.035em] text-ink sm:text-[52px] lg:text-[58px]">
            Speak English
            <br />
            with confidence.
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted">
            Practise real conversations with a teacher who fits your goal. Talk or type in your own words, and get
            gentle corrections the moment you make a mistake.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => scrollTo("teachers")}
              className="flex h-12 items-center gap-2 rounded-xl bg-accent px-5 text-[15px] font-semibold text-accent-ink transition-opacity hover:opacity-90"
            >
              Choose your teacher
              <ArrowRight className="size-4" />
            </button>
            {guide && (
              <button
                type="button"
                onClick={() => onSelect(guide.id)}
                className="flex h-12 items-center gap-2 rounded-xl border border-line bg-surface px-5 text-[15px] font-semibold text-ink transition-colors hover:border-accent/40"
              >
                Start with {guide.name}
              </button>
            )}
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            {points.map((point) => (
              <li key={point} className="flex items-center gap-2">
                <Check className="size-4 text-success" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {guide && (
          <div className="animate-in" style={{ animationDelay: "80ms" }}>
            <ConversationPreview teacher={guide} />
          </div>
        )}
      </header>

      <section id="teachers" className="scroll-mt-16 border-t border-line bg-sidebar/40">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8">
          <SectionHeading
            eyebrow="Your teachers"
            title="Meet the people you'll practise with"
            text="Each teacher has their own personality, specialty and way of correcting you. Pick one to start, and add more any time."
          />
          <TeacherGrid teachers={teachers} onSelect={onSelect} className="mt-10" />
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-16 border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8">
          <SectionHeading eyebrow="How it works" title="From hello to fluent, one conversation at a time" />
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-line bg-surface p-6">
                <span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft font-mono text-sm font-bold text-accent">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-lg font-bold tracking-[-0.01em] text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="why-us" className="scroll-mt-16 border-t border-line bg-sidebar/40">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8">
          <SectionHeading eyebrow={`Why ${app_name}`} title="Built for speaking, not just studying" />
          <div
            className={`mt-10 grid gap-4 sm:grid-cols-2 ${features.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}
          >
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-line bg-surface p-6">
                <span className="flex size-10 items-center justify-center rounded-xl bg-hover text-ink">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 text-[16px] font-bold tracking-[-0.01em] text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8">
          <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-ink px-8 py-10 text-bg md:flex-row md:items-center md:px-12">
            <div>
              <h2 className="text-[28px] leading-tight font-bold tracking-[-0.025em] md:text-[34px]">
                Ready to start speaking?
              </h2>
              <p className="mt-2 max-w-md text-[15px] leading-relaxed opacity-70">
                Pick a teacher and say hello. Your first conversation takes less than a minute to start.
              </p>
            </div>
            <button
              type="button"
              onClick={() => scrollTo("teachers")}
              className="flex h-12 shrink-0 items-center gap-2 rounded-xl bg-bg px-5 text-[15px] font-semibold text-ink transition-opacity hover:opacity-90"
            >
              Choose your teacher
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-subtle md:flex-row md:items-center md:justify-between md:px-8">
          <Wordmark />
          <p>
            Learn English by talking with AI teachers. © {new Date().getFullYear()} {app_name}
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold text-accent">{eyebrow}</p>
      <h2 className="mt-2 text-[30px] leading-[1.15] font-bold tracking-[-0.025em] text-ink md:text-[38px]">{title}</h2>
      {text && <p className="mt-3 text-[16px] leading-relaxed text-muted">{text}</p>}
    </div>
  );
}
