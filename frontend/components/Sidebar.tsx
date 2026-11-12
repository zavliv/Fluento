"use client";

import {
  Keyboard,
  LayoutDashboard,
  LayoutGrid,
  Monitor,
  Moon,
  PanelLeft,
  PanelLeftClose,
  Search,
  Sun,
} from "lucide-react";
import Link from "next/link";
import type { Theme } from "@/hooks/useTheme";
import { API_URL } from "@/lib/api";
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
  onOpenPalette: () => void;
  onOpenShortcuts: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  online: boolean | null;
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
              activeId === null && "border-accent/40",
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

        <nav className="mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          <p className="px-2.5 pt-2 pb-1.5 text-[11px] font-medium tracking-wider text-subtle uppercase">
            Your teachers
          </p>
          <ul className="space-y-0.5">
            {teachers.map((teacher) => {
              const last = props.lastMessage(teacher.id);
              const active = teacher.id === activeId;
              const preview = last
                ? `${last.role === "user" ? "You: " : ""}${toSpeakableText(messageText(last))}`
                : teacher.specialty;
              return (
                <li key={teacher.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(teacher.id)}
                    className={cn(
                      "relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
                      active ? "bg-hover" : "hover:bg-hover/70",
                    )}
                  >
                    {active && <span className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-full bg-accent" />}
                    <TeacherAvatar
                      name={teacher.name}
                      color={teacher.color}
                      size={36}
                      ring={active ? "var(--hover)" : "var(--sidebar)"}
                      presence={props.online === null ? null : props.online ? "online" : "offline"}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={cn("truncate text-sm text-ink", active ? "font-semibold" : "font-medium")}>
                          {teacher.name}
                        </span>
                        {last && <span className="shrink-0 text-[11px] text-subtle">{shortTime(last.createdAt)}</span>}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5">
                        {props.streamingTeacherId === teacher.id ? (
                          <span className="shimmer-text truncate text-xs font-medium">typing…</span>
                        ) : (
                          <span className="truncate text-xs text-muted">{preview}</span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <footer className="space-y-3 border-t border-line p-3">
          <div className="flex items-center justify-between gap-2">
            <BackendStatus online={props.online} />
            <div className="flex items-center gap-0.5">
              <IconButton label={`Keyboard shortcuts (${shortcut("/")})`} onClick={props.onOpenShortcuts}>
                <Keyboard />
              </IconButton>
              <Link
                href="/admin"
                aria-label="Admin panel"
                data-tip="Admin panel"
                className="tip tip-top inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-ink"
              >
                <LayoutDashboard className="size-4" />
              </Link>
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
}: Props) {
  const next: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <aside className="hidden w-[64px] shrink-0 flex-col items-center gap-1 border-r border-line bg-sidebar py-3 md:flex">
      <button type="button" onClick={onOpen} aria-label="Open sidebar" className="mb-2">
        <LogoMark size={36} />
      </button>
      <IconButton label={`Open sidebar (${shortcut("B")})`} tooltip="right" onClick={onOpen} className="size-9">
        <PanelLeft />
      </IconButton>
      <IconButton label="All teachers" tooltip="right" onClick={() => onSelect(null)} className="size-9">
        <LayoutGrid />
      </IconButton>
      <IconButton
        label={`Find a teacher (${shortcut("K")})`}
        tooltip="right"
        onClick={onOpenPalette}
        className="size-9"
      >
        <Search />
      </IconButton>

      <div className="my-2 h-px w-8 bg-line" />

      <div className="flex min-h-0 flex-col items-center gap-1.5 overflow-y-auto">
        {teachers.map((teacher) => (
          <button
            key={teacher.id}
            type="button"
            onClick={() => onSelect(teacher.id)}
            aria-label={teacher.name}
            data-tip={`${teacher.name} · ${teacher.specialty}`}
            className={cn(
              "tip tip-right rounded-[30%] p-0.5 transition-all",
              teacher.id === activeId ? "ring-2 ring-accent" : "opacity-80 hover:opacity-100",
            )}
          >
            <TeacherAvatar
              name={teacher.name}
              color={teacher.color}
              size={34}
              ring="var(--sidebar)"
              presence={online === null ? null : online ? "online" : "offline"}
            />
          </button>
        ))}
      </div>

      <div className="mt-auto flex flex-col items-center gap-1 pt-2">
        <IconButton label="Keyboard shortcuts" tooltip="right" onClick={onOpenShortcuts} className="size-9">
          <Keyboard />
        </IconButton>
        <IconButton
          label={`Theme: ${theme}`}
          tooltip="right"
          onClick={() => onThemeChange(next[theme])}
          className="size-9"
        >
          <ThemeIcon />
        </IconButton>
        <span
          className="tip tip-right mt-2 flex size-9 items-center justify-center"
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

function BackendStatus({ online }: { online: boolean | null }) {
  const host = API_URL.replace(/^https?:\/\//, "");
  return (
    <div className="flex min-w-0 items-center gap-2.5 px-2 py-1">
      <StatusDot online={online} />
      <div className="min-w-0 leading-tight">
        <p className="text-xs font-medium text-ink">
          {online === null ? "Checking backend…" : online ? "Backend connected" : "Backend offline"}
        </p>
        <p className="truncate font-mono text-[11px] text-subtle">{host}</p>
      </div>
    </div>
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
