import { PanelLeft, Sparkles, SquarePen } from "lucide-react";
import { modKey } from "@/lib/utils";
import { IconButton } from "./IconButton";

type Props = {
  title: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onNew: () => void;
};

export function ChatHeader({ title, sidebarOpen, onToggleSidebar, onNew }: Props) {
  const mod = modKey();
  return (
    <header className="flex h-14 shrink-0 items-center gap-1 border-b border-line/70 px-2.5 md:px-4">
      {!sidebarOpen && (
        <>
          <IconButton label={`Open sidebar (${mod}+B)`} onClick={onToggleSidebar}>
            <PanelLeft />
          </IconButton>
          <IconButton label="New chat" onClick={onNew}>
            <SquarePen />
          </IconButton>
        </>
      )}
      <h2 className="ml-1.5 truncate text-sm font-medium text-ink">{title}</h2>
      <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-muted sm:inline-flex">
        <Sparkles className="size-3 text-accent" />
        Agent
        <span className="text-subtle">·</span>
        <span className="font-mono text-[11px]">demo</span>
      </span>
    </header>
  );
}
