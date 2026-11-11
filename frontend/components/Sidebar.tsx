"use client";

import { Check, Monitor, Moon, PanelLeftClose, Pencil, Search, SquarePen, Sun, Trash2, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { Theme } from "@/hooks/useTheme";
import { API_URL } from "@/lib/api";
import type { Conversation } from "@/lib/types";
import { cn, groupConversations, modKey } from "@/lib/utils";
import { IconButton } from "./IconButton";
import { LogoMark } from "./Logo";

type Props = {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeId: string | null;
  streamingConversationId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  online: boolean | null;
};

export function Sidebar(props: Props) {
  const { open, onClose, conversations, activeId, onNew } = props;
  const [query, setQuery] = useState("");
  const mod = modKey();

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groupConversations(q ? conversations.filter((c) => c.title.toLowerCase().includes(q)) : conversations);
  }, [conversations, query]);

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
            <span className="text-[15px] font-semibold tracking-tight">Agent Chat</span>
          </div>
          <IconButton label={`Close sidebar (${mod}+B)`} onClick={onClose}>
            <PanelLeftClose />
          </IconButton>
        </div>

        <div className="space-y-2 px-3">
          <button
            type="button"
            onClick={onNew}
            className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-accent/40"
          >
            <SquarePen className="size-4 text-accent" />
            New chat
            <span className="ml-auto flex gap-0.5">
              <kbd className="kbd">{mod}</kbd>
              <kbd className="kbd">⇧</kbd>
              <kbd className="kbd">O</kbd>
            </span>
          </button>
          <label className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-subtle transition-colors focus-within:bg-hover hover:bg-hover/70">
            <Search className="size-4 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats"
              className="w-full bg-transparent text-ink outline-none placeholder:text-subtle"
            />
          </label>
        </div>

        <nav className="mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {groups.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-subtle">
              {query ? "No chats match your search." : "Your conversations will show up here."}
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="mb-3">
                <p className="px-2.5 pt-2 pb-1.5 text-[11px] font-medium tracking-wider text-subtle uppercase">
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
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </nav>

        <footer className="space-y-3 border-t border-line p-3">
          <BackendStatus online={props.online} />
          <ThemeSwitch theme={props.theme} onChange={props.onThemeChange} />
        </footer>
      </aside>
    </>
  );
}

type ItemProps = {
  conversation: Conversation;
  active: boolean;
  busy: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
};

function ConversationItem({ conversation, active, busy, onSelect, onDelete, onRename }: ItemProps) {
  const [mode, setMode] = useState<"idle" | "rename" | "confirm">("idle");
  const [draft, setDraft] = useState(conversation.title);

  const commit = (e?: FormEvent) => {
    e?.preventDefault();
    onRename(conversation.id, draft.trim() || conversation.title);
    setMode("idle");
  };

  if (mode === "rename") {
    return (
      <form onSubmit={commit} className="px-0.5 py-0.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit()}
          onKeyDown={(e) => e.key === "Escape" && setMode("idle")}
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
        onClick={() => onSelect(conversation.id)}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 py-2 pr-1 pl-3 text-left text-sm",
          active ? "font-medium text-ink" : "text-muted group-hover/item:text-ink",
        )}
      >
        <span className="truncate">{conversation.title}</span>
        {busy && <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-accent" />}
      </button>
      {mode === "confirm" ? (
        <div className="flex items-center gap-0.5 pr-1">
          <span className="mr-0.5 text-xs font-medium text-danger">Delete?</span>
          <IconButton
            label="Confirm delete"
            size="sm"
            onClick={() => onDelete(conversation.id)}
            className="hover:text-danger"
          >
            <Check />
          </IconButton>
          <IconButton label="Cancel" size="sm" onClick={() => setMode("idle")}>
            <X />
          </IconButton>
        </div>
      ) : (
        <div className={cn("items-center pr-1", active ? "flex" : "hidden group-hover/item:flex")}>
          <IconButton
            label="Rename"
            size="sm"
            onClick={() => {
              setDraft(conversation.title);
              setMode("rename");
            }}
          >
            <Pencil />
          </IconButton>
          <IconButton label="Delete" size="sm" onClick={() => setMode("confirm")} className="hover:text-danger">
            <Trash2 />
          </IconButton>
        </div>
      )}
    </div>
  );
}

function BackendStatus({ online }: { online: boolean | null }) {
  const host = API_URL.replace(/^https?:\/\//, "");
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-2 py-1">
      <span className="relative flex size-2.5">
        {online && <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-40" />}
        <span
          className={cn(
            "relative size-2.5 rounded-full",
            online === null ? "bg-subtle" : online ? "bg-success" : "bg-danger",
          )}
        />
      </span>
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
