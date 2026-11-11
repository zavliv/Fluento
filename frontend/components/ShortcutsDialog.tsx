"use client";

import { X } from "lucide-react";
import { modKey } from "@/lib/utils";
import { IconButton } from "./IconButton";
import { Dialog } from "./ui/Dialog";

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mod = modKey();
  const groups: { title: string; items: { label: string; keys: string[] }[] }[] = [
    {
      title: "General",
      items: [
        { label: "Search chats and commands", keys: [mod, "K"] },
        { label: "New chat", keys: [mod, "⇧", "O"] },
        { label: "Toggle sidebar", keys: [mod, "B"] },
        { label: "Keyboard shortcuts", keys: [mod, "/"] },
      ],
    },
    {
      title: "Chat",
      items: [
        { label: "Send message", keys: ["Enter"] },
        { label: "New line", keys: ["⇧", "Enter"] },
        { label: "Focus message box", keys: ["/"] },
        { label: "Stop generating", keys: ["Esc"] },
      ],
    },
    {
      title: "Voice",
      items: [
        { label: "Finish speaking", keys: ["Enter"] },
        { label: "Cancel voice input", keys: ["Esc"] },
      ],
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} label="Keyboard shortcuts" className="max-w-md">
      <div className="flex items-center justify-between border-b border-line py-3 pr-3 pl-5">
        <h2 className="text-[15px] font-semibold">Keyboard shortcuts</h2>
        <IconButton label="Close" tooltip={false} onClick={onClose}>
          <X />
        </IconButton>
      </div>
      <div className="max-h-[60vh] space-y-5 overflow-y-auto px-5 py-4">
        {groups.map((group) => (
          <section key={group.title}>
            <h3 className="mb-2 text-[11px] font-medium tracking-wider text-subtle uppercase">{group.title}</h3>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.label} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-ink">{item.label}</span>
                  <span className="flex gap-1">
                    {item.keys.map((key) => (
                      <kbd key={key} className="kbd">
                        {key}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
