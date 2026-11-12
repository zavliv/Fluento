"use client";

import { Bot, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Teacher, TeacherLevel, TeacherVoice } from "@/lib/teachers";
import { cn } from "@/lib/utils";
import { IconButton } from "../IconButton";
import { TeacherAvatar } from "../TeacherAvatar";
import { Switch } from "../ui/Switch";
import { Button, Field, Input, Select, Textarea } from "./ui";

const COLORS = ["#e11d48", "#db2777", "#7c3aed", "#4f46e5", "#0369a1", "#0d9488", "#16a34a", "#d97706"];
const LEVELS: TeacherLevel[] = ["Beginner", "Intermediate", "Advanced", "All levels"];

type Props = {
  teacher: Teacher;
  isNew: boolean;
  onClose: () => void;
  onSave: (teacher: Teacher) => void;
  onDelete: (id: string) => void;
};

export function TeacherEditor({ teacher, isNew, onClose, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState(teacher);
  const set = <K extends keyof Teacher>(key: K, value: Teacher[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const canSave = draft.name.trim().length > 0 && draft.specialty.trim().length > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[65] flex justify-end">
      <div className="fade-in absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? "Add teacher" : `Edit ${teacher.name}`}
        className="drawer-in relative flex h-full w-full max-w-[480px] flex-col border-l border-line bg-bg shadow-[0_0_60px_-20px_rgb(0_0_0/0.5)]"
      >
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
          <h2 className="text-[15px] font-semibold">{isNew ? "Add teacher" : `Edit ${teacher.name}`}</h2>
          <IconButton label="Close" tooltip={false} onClick={onClose}>
            <X />
          </IconButton>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-3">
              <TeacherAvatar name={draft.name} color={draft.color} size={44} />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-ink">{draft.name || "New teacher"}</p>
                <p className="truncate text-xs text-muted">{draft.specialty || "Specialty"}</p>
              </div>
            </div>
            {draft.tagline && <p className="mt-3 text-sm leading-relaxed text-muted">{draft.tagline}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Maya" />
            </Field>
            <Field label="Specialty">
              <Input
                value={draft.specialty}
                onChange={(e) => set("specialty", e.target.value)}
                placeholder="e.g. Grammar"
              />
            </Field>
          </div>

          <Field label="Tagline" hint="One line shown on the teacher card.">
            <Input value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Level">
              <Select value={draft.level} onChange={(e) => set("level", e.target.value as TeacherLevel)}>
                {LEVELS.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </Select>
            </Field>
            <Field label="Voice">
              <div className="grid h-10 grid-cols-2 gap-0.5 rounded-xl bg-hover p-0.5">
                {(["female", "male"] as TeacherVoice[]).map((voice) => (
                  <button
                    key={voice}
                    type="button"
                    onClick={() => set("voice", voice)}
                    className={cn(
                      "rounded-[10px] text-sm capitalize transition-all",
                      draft.voice === voice
                        ? "bg-surface font-semibold text-ink shadow-sm"
                        : "text-muted hover:text-ink",
                    )}
                  >
                    {voice}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <Field label="Color">
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Color ${color}`}
                  onClick={() => set("color", color)}
                  className={cn(
                    "size-8 rounded-full transition-transform hover:scale-110",
                    draft.color === color && "ring-2 ring-ink ring-offset-2 ring-offset-bg",
                  )}
                  style={{ background: color }}
                />
              ))}
            </div>
          </Field>

          <Field label="Personality" hint="How this teacher talks and behaves.">
            <Textarea rows={2} value={draft.personality} onChange={(e) => set("personality", e.target.value)} />
          </Field>

          <Field label="Skill tags" hint="Comma separated. Shown on the teacher card.">
            <Input
              value={draft.tags.join(", ")}
              onChange={(e) =>
                set(
                  "tags",
                  e.target.value.split(",").map((t) => t.trimStart()),
                )
              }
            />
          </Field>

          <Field label="Conversation starters" hint="One per line. Shown as tap-to-send prompts in a new conversation.">
            <Textarea
              rows={3}
              value={draft.starters.join("\n")}
              onChange={(e) => set("starters", e.target.value.split("\n"))}
            />
          </Field>

          <div className="flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
            <Bot className="mt-0.5 size-4 shrink-0 text-accent" />
            <p className="text-muted">
              This teacher&apos;s agent persona and the shared teaching rules live in the backend, in{" "}
              <code className="font-mono text-[12.5px] text-ink">backend/app/teachers/{draft.id}.py</code> and{" "}
              <code className="font-mono text-[12.5px] text-ink">rules.py</code>.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">Available to learners</p>
              <p className="text-xs text-muted">Turn off to hide this teacher from the app.</p>
            </div>
            <Switch checked={draft.enabled} onChange={(v) => set("enabled", v)} label="Available to learners" />
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-line px-5 py-3">
          {isNew ? (
            <span />
          ) : (
            <Button variant="danger" onClick={() => onDelete(teacher.id)}>
              <Trash2 />
              Delete
            </Button>
          )}
          <div className="flex gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!canSave}
              onClick={() =>
                onSave({
                  ...draft,
                  starters: draft.starters.map((s) => s.trim()).filter(Boolean),
                  tags: draft.tags.map((t) => t.trim()).filter(Boolean),
                })
              }
            >
              {isNew ? "Add teacher" : "Save changes"}
            </Button>
          </div>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
