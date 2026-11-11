"use client";

import {
  Download,
  Ellipsis,
  Keyboard,
  Monitor,
  Moon,
  PanelLeft,
  PanelLeftClose,
  Pencil,
  Pin,
  PinOff,
  Search,
  SquarePen,
  Sun,
  Trash2,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { Theme } from "@/hooks/useTheme";
import { API_URL } from "@/lib/api";
import type { Conversation } from "@/lib/types";
import { cn, groupConversations, modKey, shortcut } from "@/lib/utils";
import { IconButton } from "./IconButton";
import { LogoMark } from "./Logo";
import { Menu } from "./ui/Menu";

type ConversationActions = {
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onTogglePin: (id: string) => void;
  onExport: (id: string) => void;
};

type Props = ConversationActions & {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  conversations: Conversation[];
  activeId: string | null;
  streamingConversationId: string | null;
  onNew: () => void;
  onOpenPalette: () => void;
  onOpenShortcuts: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  online: boolean | null;
};

const SIDEBAR_BUTTON =
  "flex h-10 items-center rounded-xl border border-line bg-surface text-sm shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-all hover:border-accent/40 hover:shadow-[0_2px_8px_-2px_rgb(0_0_0/0.08)]";

export function Sidebar(props: Props) {
  const { open, onClose, conversations, activeId, onNew } = props;
  const mod = modKey();

  const groups = useMemo(() => groupConversations(conversations), [conversations]);

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
        aria-label="Conversations"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[276px] shrink-0 flex-col border-r border-line bg-sidebar",
          "transition-[transform,margin] duration-300 ease-[cubic-bezier(.2,.7,.2,1)] md:relative md:z-auto",
          open ? "translate-x-0" : "-translate-x-full md:-ml-[276px] md:translate-x-0",
        )}
      >
        <div className="flex h-14 items-center justify-between pr-2.5 pl-4">
          <div className="flex items-center gap-2.5">
            <LogoMark size={26} />
            <span className="text-[15px] font-semibold tracking-tight">Orbit AI</span>
          </div>
          <IconButton label={`Close sidebar (${shortcut("B")})`} tooltip="bottom" onClick={onClose}>
            <PanelLeftClose />
          </IconButton>
        </div>

        <div className="flex items-center gap-1.5 px-3">
          <button
            type="button"
            onClick={onNew}
            className={cn(SIDEBAR_BUTTON, "group/new min-w-0 flex-1 gap-2.5 px-3 font-medium text-ink")}
          >
            <SquarePen className="size-4 text-accent" />
            New chat
            <span className="ml-auto hidden gap-0.5 opacity-70 transition-opacity group-hover/new:opacity-100 md:flex">
              <kbd className="kbd">{mod}</kbd>
              <kbd className="kbd">⇧</kbd>
              <kbd className="kbd">O</kbd>
            </span>
          </button>
          <button
            type="button"
            onClick={props.onOpenPalette}
            aria-label="Search chats"
            data-tip={`Search chats (${shortcut("K")})`}
            className={cn(SIDEBAR_BUTTON, "tip tip-bottom w-10 shrink-0 justify-center text-muted hover:text-ink")}
          >
            <Search className="size-4" />
          </button>
        </div>

        <nav className="mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {groups.length === 0 ? (
            <EmptyList />
          ) : (
            groups.map((group) => (
              <div key={group.label} className="mb-3">
                <p className="flex items-center gap-1.5 px-2.5 pt-2 pb-1.5 text-[11px] font-medium tracking-wider text-subtle uppercase">
                  {group.label === "Pinned" && <Pin className="size-3" />}
                  {group.label}
                </p>
                <ul className="space-y-px">
                  {group.items.map((c) => (
                    <li key={c.id}>
                      <ConversationItem
                        conversation={c}
                        active={c.id === activeId}
                        busy={c.id === props.streamingConversationId}
                        onSelect={props.onSelect}
                        onDelete={props.onDelete}
                        onRename={props.onRename}
                        onTogglePin={props.onTogglePin}
                        onExport={props.onExport}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </nav>

        <footer className="space-y-3 border-t border-line p-3">
          <div className="flex items-center justify-between gap-2">
            <BackendStatus online={props.online} />
            <IconButton label={`Keyboard shortcuts (${shortcut("/")})`} onClick={props.onOpenShortcuts}>
              <Keyboard />
            </IconButton>
          </div>
          <ThemeSwitch theme={props.theme} onChange={props.onThemeChange} />
        </footer>
      </aside>

      {!open && <Rail {...props} />}
    </>
  );
}

function Rail({ onOpen, onNew, onOpenPalette, onOpenShortcuts, online, theme, onThemeChange }: Props) {
  const next: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <aside className="hidden w-[60px] shrink-0 flex-col items-center gap-1 border-r border-line bg-sidebar py-3 md:flex">
      <button type="button" onClick={onOpen} aria-label="Open sidebar" className="mb-2">
        <LogoMark size={30} />
      </button>
      <IconButton label={`Open sidebar (${shortcut("B")})`} tooltip="right" onClick={onOpen} className="size-9">
        <PanelLeft />
      </IconButton>
      <IconButton label={`New chat (${shortcut("⇧", "O")})`} tooltip="right" onClick={onNew} className="size-9">
        <SquarePen />
      </IconButton>
      <IconButton label={`Search (${shortcut("K")})`} tooltip="right" onClick={onOpenPalette} className="size-9">
        <Search />
      </IconButton>

      <div className="mt-auto flex flex-col items-center gap-1">
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

function EmptyList() {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-hover text-subtle">
        <SquarePen className="size-4" />
      </span>
      <p className="text-sm font-medium text-ink">No chats yet</p>
      <p className="mt-1 text-xs text-subtle">Start a conversation and it&apos;ll show up here.</p>
    </div>
  );
}

type ItemProps = ConversationActions & {
  conversation: Conversation;
  active: boolean;
  busy: boolean;
};

function ConversationItem({ conversation, active, busy, ...actions }: ItemProps) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(conversation.title);

  const commit = (e?: FormEvent) => {
    e?.preventDefault();
    actions.onRename(conversation.id, draft.trim() || conversation.title);
    setRenaming(false);
  };

  if (renaming) {
    return (
      <form onSubmit={commit} className="px-0.5 py-0.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit()}
          onKeyDown={(e) => e.key === "Escape" && setRenaming(false)}
          className="w-full rounded-lg border border-accent/50 bg-surface px-2.5 py-1.5 text-sm text-ink outline-none"
        />
      </form>
    );
  }

  return (
    <div
      className={cn(
        "group/item relative flex items-center rounded-lg transition-colors",
        active ? "bg-hover" : "hover:bg-hover/70",
      )}
    >
      {active && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-accent" />}
      <button
        type="button"
        onClick={() => actions.onSelect(conversation.id)}
        onDoubleClick={() => {
          setDraft(conversation.title);
          setRenaming(true);
        }}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 py-2 pr-1 pl-3 text-left text-sm",
          active ? "font-medium text-ink" : "text-muted group-hover/item:text-ink",
        )}
      >
        <span className="truncate">{conversation.title}</span>
        {busy && <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-accent" />}
      </button>
      <Menu
        items={[
          {
            label: conversation.pinned ? "Unpin" : "Pin to top",
            icon: conversation.pinned ? <PinOff /> : <Pin />,
            onSelect: () => actions.onTogglePin(conversation.id),
          },
          {
            label: "Rename",
            icon: <Pencil />,
            onSelect: () => {
              setDraft(conversation.title);
              setRenaming(true);
            },
          },
          { label: "Export as Markdown", icon: <Download />, onSelect: () => actions.onExport(conversation.id) },
          { label: "Delete", icon: <Trash2 />, danger: true, onSelect: () => actions.onDelete(conversation.id) },
        ]}
        trigger={({ open, toggle, ref }) => (
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            aria-label="Chat options"
            title="Chat options"
            className={cn(
              "mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-subtle transition-colors hover:bg-line/70 hover:text-ink",
              open || active ? "flex" : "hidden group-hover/item:flex",
              open && "bg-line/70 text-ink",
            )}
          >
            <Ellipsis className="size-4" />
          </button>
        )}
      />
    </div>
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
