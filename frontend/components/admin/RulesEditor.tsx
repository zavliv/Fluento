"use client";

import { ArrowDown, ArrowUp, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { useLoad } from "@/hooks/useLoad";
import { api, type RuleSection } from "@/lib/api";
import { Switch } from "../ui/Switch";
import { useToast } from "../ui/Toast";
import { ListEditor } from "./ListEditor";
import { Button, EmptyState, ErrorState, Field, Input, LoadingState, PageHeader } from "./ui";

function slug(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function body(section: RuleSection) {
  const { id: _id, ...rest } = section;
  return { ...rest, rules: rest.rules.map((r) => r.trim()).filter(Boolean) };
}

export function RulesEditor() {
  const toast = useToast();
  const load = useCallback(() => api.admin.rules(), []);
  const { data: sections, loading, error, reload, setData } = useLoad(load);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const replace = (saved: RuleSection) =>
    setData((list) => list?.map((s) => (s.id === saved.id ? saved : s)).sort((a, b) => a.order - b.order) ?? null);

  const add = async () => {
    const title = newTitle.trim();
    if (!title || !sections) return;
    setAdding(true);
    try {
      const created = await api.admin.createRuleSection({
        id: slug(title) || `section-${sections.length + 1}`,
        title,
        rules: [],
        enabled: true,
        order: Math.max(0, ...sections.map((s) => s.order)) + 1,
      });
      setData((list) => [...(list ?? []), created]);
      setNewTitle("");
      toast({ message: `Section “${title}” added` });
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Couldn't add the section" });
    } finally {
      setAdding(false);
    }
  };

  const move = async (index: number, delta: number) => {
    if (!sections) return;
    const a = sections[index];
    const b = sections[index + delta];
    try {
      const [savedA, savedB] = await Promise.all([
        api.admin.updateRuleSection(a.id, { ...body(a), order: b.order }),
        api.admin.updateRuleSection(b.id, { ...body(b), order: a.order }),
      ]);
      replace(savedA);
      replace(savedB);
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Couldn't reorder" });
    }
  };

  return (
    <>
      <PageHeader
        title="Shared rules"
        description="Rules every teacher follows, added to the end of each system prompt. Placeholders: {name} is the teacher's name, {app} is the app name, and {teachers} lists the other visible teachers with their specialties."
      />

      {loading && !sections ? (
        <LoadingState />
      ) : error && !sections ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <div className="space-y-5">
          {!sections?.length && <EmptyState title="No rule sections" text="Add a section below." />}
          {sections?.map((section, i) => (
            <SectionCard
              key={section.id}
              section={section}
              first={i === 0}
              last={i === sections.length - 1}
              onMove={(delta) => void move(i, delta)}
              onSaved={replace}
              onDeleted={() => setData((list) => list?.filter((s) => s.id !== section.id) ?? null)}
            />
          ))}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void add();
            }}
            className="flex flex-wrap items-end gap-3 rounded-2xl border border-dashed border-line p-5"
          >
            <div className="min-w-60 flex-1">
              <Field label="New section">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Exam practice"
                />
              </Field>
            </div>
            <Button type="submit" variant="primary" disabled={!newTitle.trim() || adding}>
              {adding ? <LoaderCircle className="animate-spin" /> : <Plus />}
              Add section
            </Button>
          </form>
        </div>
      )}
    </>
  );
}

function SectionCard({
  section,
  first,
  last,
  onMove,
  onSaved,
  onDeleted,
}: {
  section: RuleSection;
  first: boolean;
  last: boolean;
  onMove: (delta: number) => void;
  onSaved: (section: RuleSection) => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState(section);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = JSON.stringify(body(draft)) !== JSON.stringify(body({ ...section, order: draft.order }));

  const save = async (next = draft) => {
    setSaving(true);
    try {
      const saved = await api.admin.updateRuleSection(section.id, { ...body(next), order: section.order });
      setDraft(saved);
      onSaved(saved);
      toast({ message: `“${saved.title}” saved` });
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Couldn't save" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await api.admin.deleteRuleSection(section.id);
      onDeleted();
      toast({ message: `“${section.title}” deleted` });
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Couldn't delete" });
    }
  };

  return (
    <section className={`rounded-2xl border border-line bg-surface ${draft.enabled ? "" : "opacity-70"}`}>
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
        <input
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          aria-label="Section title"
          className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-ink outline-none"
        />
        <span className="font-mono text-xs text-subtle">{section.id}</span>
        <div className="flex items-center">
          <button
            type="button"
            aria-label="Move up"
            disabled={first}
            onClick={() => onMove(-1)}
            className="flex size-8 items-center justify-center rounded-lg text-subtle hover:bg-hover hover:text-ink disabled:opacity-30"
          >
            <ArrowUp className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={last}
            onClick={() => onMove(1)}
            className="flex size-8 items-center justify-center rounded-lg text-subtle hover:bg-hover hover:text-ink disabled:opacity-30"
          >
            <ArrowDown className="size-4" />
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted">
          {draft.enabled ? "On" : "Off"}
          <Switch
            checked={draft.enabled}
            label={`${draft.title} enabled`}
            onChange={(enabled) => void save({ ...draft, enabled })}
          />
        </label>
      </header>

      <div className="p-5">
        <ListEditor items={draft.rules} onChange={(rules) => setDraft({ ...draft, rules })} addLabel="Add rule" />
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">Delete this section?</span>
            <Button onClick={() => setConfirmDelete(false)} className="h-9">
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void remove()} className="h-9 border border-danger/40">
              Delete
            </Button>
          </div>
        ) : (
          <Button variant="danger" onClick={() => setConfirmDelete(true)} className="h-9">
            <Trash2 />
            Delete
          </Button>
        )}
        <Button variant="primary" onClick={() => void save()} disabled={!dirty || saving} className="h-9">
          {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
          Save section
        </Button>
      </footer>
    </section>
  );
}
