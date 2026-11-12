"use client";

import { CornerDownLeft, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Dialog } from "./ui/Dialog";

export type Command = {
  id: string;
  label: string;
  group: "Actions" | "Teachers";
  icon: ReactNode;
  hint?: string;
  run: () => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  commands: Command[];
};

export function CommandPalette({ open, onClose, commands }: Props) {
  return (
    <Dialog open={open} onClose={onClose} label="Command palette" className="max-w-xl">
      {open && <PaletteBody commands={commands} onClose={onClose} />}
    </Dialog>
  );
}

function PaletteBody({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? commands.filter((c) => c.label.toLowerCase().includes(q)) : commands;
    const teachers = matches.filter((c) => c.group === "Teachers");
    const actions = matches.filter((c) => c.group === "Actions");
    return [...teachers, ...actions];
  }, [commands, query]);

  const active = Math.min(index, Math.max(results.length - 1, 0));

  const run = (command: Command | undefined) => {
    if (!command) return;
    onClose();
    command.run();
  };

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setIndex((active + 1) % Math.max(results.length, 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setIndex((active - 1 + results.length) % Math.max(results.length, 1));
        } else if (e.key === "Enter") {
          e.preventDefault();
          run(results[active]);
        }
      }}
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="size-[18px] shrink-0 text-subtle" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          placeholder="Find a teacher or run a command…"
          className="h-14 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-subtle"
        />
        <kbd className="kbd">Esc</kbd>
      </div>

      <div className="max-h-[50vh] overflow-y-auto p-2">
        {results.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-subtle">No results for “{query}”</p>
        ) : (
          results.map((command, i) => (
            <div key={command.id}>
              {(i === 0 || results[i - 1].group !== command.group) && (
                <p className="px-3 pt-2.5 pb-1.5 text-[11px] font-medium tracking-wider text-subtle uppercase">
                  {command.group}
                </p>
              )}
              <button
                type="button"
                onMouseMove={() => setIndex(i)}
                onClick={() => run(command)}
                className={cn(
                  "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors [&_svg]:size-4",
                  i === active ? "bg-hover text-ink" : "text-muted",
                )}
              >
                <span className={cn("shrink-0", i === active ? "text-accent" : "text-subtle")}>{command.icon}</span>
                <span className="truncate">{command.label}</span>
                <span className="ml-auto flex shrink-0 items-center gap-2">
                  {command.hint && <span className="text-xs text-subtle">{command.hint}</span>}
                  {i === active && <CornerDownLeft className="text-subtle" />}
                </span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
