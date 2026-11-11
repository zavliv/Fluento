"use client";

import { Download, Ellipsis, PanelLeft, Pin, PinOff, Sparkles, SquarePen, Trash2 } from "lucide-react";
import type { Conversation } from "@/lib/types";
import { IconButton } from "./IconButton";
import { Menu } from "./ui/Menu";

type Props = {
  conversation: Conversation | null;
  sidebarOpen: boolean;
  model: string | null;
  onToggleSidebar: () => void;
  onNew: () => void;
  onTogglePin: (id: string) => void;
  onExport: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ChatHeader({ conversation, sidebarOpen, model, ...actions }: Props) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line/70 px-2.5 md:px-4">
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

      <div className="flex items-center justify-end gap-1.5">
        <span className="hidden h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs text-muted sm:inline-flex">
          <Sparkles className="size-3 text-accent" />
          <span className="max-w-40 truncate font-mono text-[11px]">{model ?? "offline"}</span>
        </span>

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
