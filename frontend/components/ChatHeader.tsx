"use client";

import { Download, Ellipsis, LayoutGrid, PanelLeft, RotateCcw, Sparkles } from "lucide-react";
import type { Teacher } from "@/lib/teachers";
import { IconButton } from "./IconButton";
import { PresenceStatus } from "./PresenceStatus";
import { TeacherAvatar } from "./TeacherAvatar";
import { Menu } from "./ui/Menu";

type Props = {
  teacher: Teacher | null;
  online: boolean | null;
  typing: boolean;
  sidebarOpen: boolean;
  model: string | null;
  title?: string;
  onToggleSidebar: () => void;
  onShowTeachers: () => void;
  onExport: () => void;
  onClear: () => void;
};

export function ChatHeader({ teacher, online, typing, sidebarOpen, model, title = "All teachers", ...actions }: Props) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line/70 px-2.5 md:px-4">
      <div className="flex min-w-0 items-center gap-1">
        {!sidebarOpen && (
          <div className="flex items-center gap-1 md:hidden">
            <IconButton label="Open sidebar" tooltip="bottom" onClick={actions.onToggleSidebar}>
              <PanelLeft />
            </IconButton>
            {teacher && (
              <IconButton label="All teachers" tooltip="bottom" onClick={actions.onShowTeachers}>
                <LayoutGrid />
              </IconButton>
            )}
          </div>
        )}

        {teacher ? (
          <div className="ml-1.5 flex min-w-0 items-center gap-2.5">
            <TeacherAvatar
              name={teacher.name}
              color={teacher.color}
              size={32}
              presence={online === null ? null : online ? "online" : "offline"}
            />
            <div className="min-w-0 leading-tight">
              <h2 className="truncate text-sm font-semibold text-ink">{teacher.name}</h2>
              <p className="flex items-center gap-1.5 truncate text-xs text-muted">
                <PresenceStatus online={online} typing={typing} />
                {(online !== null || typing) && <span className="text-subtle">·</span>}
                <span className="truncate">{teacher.specialty}</span>
              </p>
            </div>
          </div>
        ) : (
          <h2 className="ml-1.5 text-sm font-medium text-ink">{title}</h2>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="hidden h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs text-muted sm:inline-flex">
          <Sparkles className="size-3 text-accent" />
          <span className="max-w-40 truncate font-mono text-[11px]">{model ?? "offline"}</span>
        </span>

        {teacher && (
          <Menu
            items={[
              { label: "Export conversation", icon: <Download />, onSelect: actions.onExport },
              { label: "Clear conversation", icon: <RotateCcw />, danger: true, onSelect: actions.onClear },
            ]}
            trigger={({ toggle, ref }) => (
              <span ref={ref} className="flex">
                <IconButton label="Conversation options" tooltip="bottom-end" onClick={toggle}>
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
