"use client";

import { Download, Ellipsis, PanelLeft, Pin, PinOff, Search, Sparkles, SquarePen, Trash2 } from "lucide-react";
import type { Conversation } from "@/lib/types";
import { modKey } from "@/lib/utils";
import { IconButton } from "./IconButton";
import { Menu } from "./ui/Menu";

type Props = {
  conversation: Conversation | null;
  sidebarOpen: boolean;
  model: string | null;
  onToggleSidebar: () => void;
  onNew: () => void;
  onOpenPalette: () => void;
  onTogglePin: (id: string) => void;
  onExport: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ChatHeader({ conversation, sidebarOpen, model, ...actions }: Props) {
  const mod = modKey();

  return (
    <header className="grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line/70 px-2.5 md:px-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)_minmax(0,1fr)]">
      <div className="flex min-w-0 items-center gap-1">
        {!sidebarOpen && (
          <div className="flex items-center gap-1 md:hidden">
            <IconButton label="Open sidebar" tooltip="bottom" onClick={actions.onToggleSidebar}>
              <PanelLeft />
            </IconButton>
            <IconButton label="New chat" tooltip="bottom" onClick={actions.onNew}>
              <SquarePen />
            </IconButton>
          </div>
        )}
        <div className="ml-1.5 flex min-w-0 items-center gap-2">
          {conversation?.pinned && <Pin className="size-3.5 shrink-0 text-accent" />}
          <h2 className="truncate text-sm font-medium text-ink">{conversation?.title ?? "New chat"}</h2>
        </div>
      </div>

      <button
        type="button"
        onClick={actions.onOpenPalette}
        className="hidden h-9 w-full items-center gap-2.5 rounded-xl border border-line bg-surface px-3 text-sm text-subtle shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors hover:border-accent/35 hover:text-muted lg:flex"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">Search chats and commands…</span>
        <span className="ml-auto flex shrink-0 gap-0.5">
          <kbd className="kbd">{mod}</kbd>
          <kbd className="kbd">K</kbd>
        </span>
      </button>

      <div className="flex items-center justify-end gap-1.5">
        <span className="hidden h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs text-muted sm:inline-flex">
          <Sparkles className="size-3 text-accent" />
          <span className="max-w-40 truncate font-mono text-[11px]">{model ?? "offline"}</span>
        </span>

        <IconButton label="Search" tooltip="bottom" onClick={actions.onOpenPalette} className="lg:hidden">
          <Search />
        </IconButton>

        {conversation && (
          <Menu
            items={[
              {
                label: conversation.pinned ? "Unpin chat" : "Pin chat",
                icon: conversation.pinned ? <PinOff /> : <Pin />,
                onSelect: () => actions.onTogglePin(conversation.id),
              },
              { label: "Export as Markdown", icon: <Download />, onSelect: () => actions.onExport(conversation.id) },
              {
                label: "Delete chat",
                icon: <Trash2 />,
                danger: true,
                onSelect: () => actions.onDelete(conversation.id),
              },
            ]}
            trigger={({ toggle, ref }) => (
              <span ref={ref} className="flex">
                <IconButton label="Chat options" tooltip="bottom-end" onClick={toggle}>
                  <Ellipsis />
                </IconButton>
              </span>
            )}
          />
        )}
      </div>
    </header>
  );
}
