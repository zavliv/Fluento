"use client";

import {
  Flame,
  GraduationCap,
  Keyboard,
  LayoutGrid,
  LogOut,
  Monitor,
  Moon,
  PanelLeft,
  PanelLeftClose,
  Search,
  SpellCheck,
  Sun,
  X,
  Zap,
} from "lucide-react";
import type { Theme } from "@/hooks/useTheme";
import type { User } from "@/lib/api";
import { toSpeakableText } from "@/lib/export";
import type { Teacher } from "@/lib/teachers";
import type { Message } from "@/lib/types";
import { cn, messageText, shortcut, shortTime } from "@/lib/utils";
import { IconButton } from "./IconButton";
import { LogoMark } from "./Logo";
import { TeacherAvatar } from "./TeacherAvatar";
import { Wordmark } from "./Wordmark";

type Props = {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  teachers: Teacher[];
  activeId: string | null;
  streamingTeacherId: string | null;
  lastMessage: (teacherId: string) => Message | null;
  onSelect: (teacherId: string | null) => void;
  onRemove: (teacherId: string) => void;
  onOpenPalette: () => void;
  onOpenShortcuts: () => void;
  mistakesOpen: boolean;
  mistakeCount: number | null;
  onOpenMistakes: () => void;
  practiceOpen: boolean;
  onOpenPractice: () => void;
  streak: number | null;
  practiceDone: boolean;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  online: boolean | null;
  user: User;
  onLogout: () => void;
};

const SIDEBAR_BUTTON =
  "flex h-10 items-center rounded-xl border border-line bg-surface text-sm shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-all hover:border-accent/40 hover:shadow-[0_2px_8px_-2px_rgb(0_0_0/0.08)]";

export function Sidebar(props: Props) {
  const { open, onClose, teachers, activeId, onSelect } = props;

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className={cn(
          "fixed inset-0 z-30 bg-black/35 transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        aria-label="Teachers"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[276px] shrink-0 flex-col border-r border-line bg-sidebar",
          "transition-[transform,margin] duration-300 ease-[cubic-bezier(.2,.7,.2,1)] md:relative md:z-auto",
          open ? "translate-x-0" : "-translate-x-full md:-ml-[276px] md:translate-x-0",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line/70 pr-2.5 pl-4">
          <Wordmark />
          <IconButton label={`Close sidebar (${shortcut("B")})`} tooltip="bottom" onClick={onClose}>
            <PanelLeftClose />
          </IconButton>
        </div>

        <div className="flex items-center gap-2 px-3 pt-3">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={cn(
              SIDEBAR_BUTTON,
              "min-w-0 flex-1 gap-2.5 px-3 font-medium text-ink",
              activeId === null && !props.mistakesOpen && "border-accent/40",
            )}
          >
            <LayoutGrid className="size-4 text-accent" />
            All teachers
          </button>
          <button
            type="button"
            onClick={props.onOpenPalette}
            aria-label="Find a teacher"
            data-tip={`Find a teacher (${shortcut("K")})`}
            className={cn(SIDEBAR_BUTTON, "tip tip-bottom w-10 shrink-0 justify-center text-muted hover:text-ink")}
          >
            <Search className="size-4" />
          </button>
        </div>

        <div className="px-3 pt-2">
          <button
            type="button"
            onClick={props.onOpenMistakes}
            aria-current={props.mistakesOpen ? "page" : undefined}
            className={cn(
              "flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm transition-colors",
              props.mistakesOpen ? "bg-hover font-semibold text-ink" : "text-muted hover:bg-hover/70 hover:text-ink",
            )}
          >
            <SpellCheck className="size-4" />
            My mistakes
            {!!props.mistakeCount && (
              <span className="ml-auto rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent tabular-nums">
                {props.mistakeCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={props.onOpenPractice}
            aria-current={props.practiceOpen ? "page" : undefined}
            className={cn(
              "flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm transition-colors",
              props.practiceOpen ? "bg-hover font-semibold text-ink" : "text-muted hover:bg-hover/70 hover:text-ink",
            )}
          >
            <Zap className="size-4" />
            Practice
            {props.streak !== null && (
              <span
                className={cn(
                  "ml-auto inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                  props.streak > 0 ? "text-white" : "bg-hover text-muted",
                )}
                style={props.streak > 0 ? { background: props.practiceDone ? "#f97316" : "#fb923c" } : undefined}
                title={props.practiceDone ? "Streak safe for today" : "Do today's challenge to keep your streak"}
              >
                <Flame className="size-3" />
                {props.streak}
              </span>
            )}
          </button>
        </div>

        <nav className="mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {teachers.length === 0 ? (
            <div className="mx-1 mt-2 flex flex-col items-center rounded-2xl border border-dashed border-line px-4 py-8 text-center">
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <GraduationCap className="size-5" />
              </span>
              <p className="mt-3 text-sm font-semibold text-ink">No teachers yet</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Pick a teacher to start learning. They&apos;ll appear here so you can come back anytime.
              </p>
            </div>
          ) : (
            <>
              <p className="px-2.5 pt-2 pb-1.5 text-[11px] font-medium tracking-wider text-subtle uppercase">
                My teachers
              </p>
              <ul className="space-y-0.5">
                {teachers.map((teacher) => {
                  const last = props.lastMessage(teacher.id);
                  const active = teacher.id === activeId;
                  const preview = last
                    ? `${last.role === "user" ? "You: " : ""}${toSpeakableText(messageText(last))}`
                    : "Say hello to start";
                  return (
                    <li key={teacher.id} className="group/item relative">
                      <button
                        type="button"
                        onClick={() => onSelect(teacher.id)}
                        className={cn(
                          "relative flex w-full items-center gap-3 rounded-xl py-2 pr-8 pl-2.5 text-left transition-colors",
                          active ? "bg-hover" : "hover:bg-hover/70",
                        )}
                      >
                        {active && (
                          <span
                            className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-full"
                            style={{ background: teacher.color }}
                          />
                        )}
                        <TeacherAvatar
                          name={teacher.name}
                          color={teacher.color}
                          size={36}
                          ring={active ? "var(--hover)" : "var(--sidebar)"}
                          presence={
                            props.online === null ? null : props.online && teacher.online ? "online" : "offline"
                          }
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className={cn("truncate text-sm text-ink", active ? "font-semibold" : "font-medium")}>
                              {teacher.name}
                            </span>
                            {last && (
                              <span className="shrink-0 text-[11px] text-subtle transition-opacity group-hover/item:opacity-0">
                                {shortTime(last.createdAt)}
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5">
                            {props.streamingTeacherId === teacher.id ? (
                              <span className="shimmer-text truncate text-xs font-medium">typing…</span>
                            ) : (
                              <span className={cn("truncate text-xs", last ? "text-muted" : "text-subtle italic")}>
                                {preview}
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => props.onRemove(teacher.id)}
                        aria-label={`Remove ${teacher.name} from my teachers`}
                        title="Remove from my teachers"
                        className="absolute top-2 right-1.5 flex size-6 items-center justify-center rounded-md text-subtle opacity-0 transition-all group-hover/item:opacity-100 hover:bg-line/70 hover:text-ink focus-visible:opacity-100"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </nav>

        <footer className="space-y-3 border-t border-line p-3">
          <div className="flex items-center gap-2.5 rounded-xl px-1.5 py-1">
            <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-hover text-sm font-semibold text-ink">
              {props.user.name.trim().charAt(0).toUpperCase()}
              <span
                aria-hidden
                className={cn(
                  "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-[var(--sidebar)]",
                  props.online === null ? "bg-subtle" : props.online ? "bg-success" : "bg-danger",
                )}
              />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold text-ink">{props.user.name}</p>
              <p className="truncate text-xs text-subtle">{props.user.email}</p>
            </div>
            <div className="flex shrink-0 items-center">
              <IconButton label={`Keyboard shortcuts (${shortcut("/")})`} onClick={props.onOpenShortcuts}>
                <Keyboard />
              </IconButton>
              <IconButton label="Log out" onClick={props.onLogout}>
                <LogOut />
              </IconButton>
            </div>
          </div>
          <ThemeSwitch theme={props.theme} onChange={props.onThemeChange} />
        </footer>
      </aside>

      {!open && <Rail {...props} />}
    </>
  );
}

function Rail({
  onOpen,
  onSelect,
  onOpenPalette,
  teachers,
  activeId,
  online,
  theme,
  onThemeChange,
  onOpenShortcuts,
  onOpenMistakes,
  mistakeCount,
  onOpenPractice,
}: Props) {
  const next: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  const railButton = "size-10 rounded-xl [&_svg]:size-[18px]";

  return (
    <aside className="hidden w-[68px] shrink-0 flex-col border-r border-line bg-sidebar md:flex">
      <div className="flex h-14 shrink-0 items-center justify-center border-b border-line/70">
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-label="All teachers"
          data-tip="All teachers"
          className="tip tip-right rounded-[30%] transition-transform hover:scale-105"
        >
          <LogoMark size={34} />
        </button>
      </div>

      <div className="flex flex-col items-center gap-1 pt-3">
        <IconButton label={`Expand sidebar (${shortcut("B")})`} tooltip="right" onClick={onOpen} className={railButton}>
          <PanelLeft />
        </IconButton>
        <IconButton
          label={`Find a teacher (${shortcut("K")})`}
          tooltip="right"
          onClick={onOpenPalette}
          className={railButton}
        >
          <Search />
        </IconButton>
        <span className="relative">
          <IconButton label="My mistakes" tooltip="right" onClick={onOpenMistakes} className={railButton}>
            <SpellCheck />
          </IconButton>
          {!!mistakeCount && (
            <span className="pointer-events-none absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 font-bold text-accent-ink tabular-nums">
              {mistakeCount > 99 ? "99+" : mistakeCount}
            </span>
          )}
        </span>
        <IconButton label="Practice" tooltip="right" onClick={onOpenPractice} className={railButton}>
          <Zap />
        </IconButton>
      </div>

      <div className="mx-auto my-3 h-px w-7 bg-line" />

      <nav aria-label="Teachers" className="flex flex-col gap-1">
        {teachers.map((teacher) => {
          const active = teacher.id === activeId;
          return (
            <div key={teacher.id} className="group/rail relative flex justify-center">
              <span
                aria-hidden
                className={cn(
                  "absolute top-1/2 left-0 w-[3px] -translate-y-1/2 rounded-r-full transition-all duration-200",
                  active ? "h-6 opacity-100" : "h-2 opacity-0 group-hover/rail:opacity-60",
                )}
                style={{ background: teacher.color }}
              />
              <button
                type="button"
                onClick={() => onSelect(teacher.id)}
                aria-label={teacher.name}
                aria-current={active ? "page" : undefined}
                data-tip={`${teacher.name} · ${teacher.specialty}`}
                className={cn(
                  "tip tip-right flex size-11 items-center justify-center rounded-xl transition-colors",
                  active ? "bg-hover" : "hover:bg-hover/70",
                )}
              >
                <TeacherAvatar
                  name={teacher.name}
                  color={teacher.color}
                  size={32}
                  className={cn("transition-opacity", !active && "opacity-75 group-hover/rail:opacity-100")}
                />
              </button>
            </div>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-1 border-t border-line/70 py-3">
        <IconButton label="Keyboard shortcuts" tooltip="right" onClick={onOpenShortcuts} className={railButton}>
          <Keyboard />
        </IconButton>
        <IconButton
          label={`Theme: ${theme}`}
          tooltip="right"
          onClick={() => onThemeChange(next[theme])}
          className={railButton}
        >
          <ThemeIcon />
        </IconButton>
        <span
          className="tip tip-right flex size-10 items-center justify-center"
          data-tip={online === null ? "Checking backend…" : online ? "Backend connected" : "Backend offline"}
        >
          <StatusDot online={online} />
        </span>
      </div>
    </aside>
  );
}

function StatusDot({ online }: { online: boolean | null }) {
  return (
    <span className="relative flex size-2.5">
      {online && <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-40" />}
      <span
        className={cn(
          "relative size-2.5 rounded-full",
          online === null ? "bg-subtle" : online ? "bg-success" : "bg-danger",
        )}
      />
    </span>
  );
}

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
];

function ThemeSwitch({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-0.5 rounded-xl bg-hover p-0.5">
      {THEMES.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => onChange(value)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-[10px] py-1.5 text-xs transition-all",
            theme === value ? "bg-surface font-medium text-ink shadow-sm" : "text-muted hover:text-ink",
          )}
        >
          <Icon className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
