"use client";

import { ArrowLeft, Eye, LoaderCircle, Save, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useLoad } from "@/hooks/useLoad";
import { api } from "@/lib/api";
import {
  GOALS,
  LEVELS,
  type AdminTeacher,
  type TeacherGoal,
  type TeacherLevel,
  type TeacherVoice,
} from "@/lib/teachers";
import { cn } from "@/lib/utils";
import { IconButton } from "../IconButton";
import { TeacherCard } from "../TeacherCard";
import { Dialog } from "../ui/Dialog";
import { Switch } from "../ui/Switch";
import { useToast } from "../ui/Toast";
import { ListEditor } from "./ListEditor";
import { Button, Card, ErrorState, Field, Input, LoadingState, Select, Textarea } from "./ui";

const COLORS = ["#e11d48", "#db2777", "#7c3aed", "#4f46e5", "#0369a1", "#0d9488", "#16a34a", "#d97706"];

const BLANK: AdminTeacher = {
  id: "",
  name: "",
  role: "",
  specialty: "",
  tagline: "",
  description: "",
  quote: "",
  level: "All levels",
  voice: "female",
  color: "#0d9488",
  enabled: true,
  order: 0,
  starters: [],
  tags: [],
  goals: [],
  persona: {
    background: "",
    personality: [],
    teaching_style: [],
    correction_style: "",
    focus: [],
    boundaries: [],
    sample_phrases: [],
    languages: ["English"],
    temperature: 0.5,
  },
};

function clean(t: AdminTeacher): AdminTeacher {
  const list = (items: string[]) => items.map((s) => s.trim()).filter(Boolean);
  return {
    ...t,
    starters: list(t.starters),
    tags: list(t.tags),
    persona: {
      ...t.persona,
      personality: list(t.persona.personality),
      teaching_style: list(t.persona.teaching_style),
      focus: list(t.persona.focus),
      boundaries: list(t.persona.boundaries),
      sample_phrases: list(t.persona.sample_phrases),
      languages: list(t.persona.languages),
    },
  };
}

export function TeacherEditor({ teacherId }: { teacherId: string }) {
  const isNew = teacherId === "new";
  const load = useCallback(
    () =>
      isNew ? api.admin.teachers().then((all) => ({ ...BLANK, order: all.length })) : api.admin.teacher(teacherId),
    [isNew, teacherId],
  );
  const { data, loading, error, reload } = useLoad(load);

  if (loading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  return <EditorForm key={data.id || "new"} initial={data} isNew={isNew} />;
}

function EditorForm({ initial, isNew }: { initial: AdminTeacher; isNew: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [baseline, setBaseline] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const set = <K extends keyof AdminTeacher>(key: K, value: AdminTeacher[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const setPersona = <K extends keyof AdminTeacher["persona"]>(key: K, value: AdminTeacher["persona"][K]) =>
    setDraft((d) => ({ ...d, persona: { ...d.persona, [key]: value } }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  const save = async () => {
    setError(null);
    setSaving(true);
    const body = clean(draft);
    try {
      if (isNew) {
        await api.admin.createTeacher(body);
        toast({ message: `${body.name} created` });
        router.replace(`/admin/teachers/${body.id}`);
      } else {
        const { id, created_at: _c, updated_at: _u, ...rest } = body;
        const saved = await api.admin.updateTeacher(id, rest);
        setBaseline(saved);
        setDraft(saved);
        toast({ message: `${saved.name} saved. Learners see the changes right away.` });
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the teacher.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await api.admin.deleteTeacher(draft.id);
      toast({ message: `${draft.name} deleted` });
      router.replace("/admin/teachers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete the teacher.");
    }
  };

  const preview = async () => {
    setPreviewing(true);
    try {
      const { prompt: text } = await api.admin.previewPrompt(clean({ ...draft, id: draft.id || "preview" }));
      setPrompt(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't build the prompt preview.");
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <>
      <Link
        href="/admin/teachers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        All teachers
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">
            {isNew ? "New teacher" : `Edit ${initial.name}`}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isNew ? "Create a teacher and their AI persona." : "Changes go live for learners as soon as you save."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => void preview()} disabled={previewing}>
            {previewing ? <LoaderCircle className="animate-spin" /> : <Eye />}
            Preview prompt
          </Button>
          <Button variant="primary" onClick={() => void save()} disabled={saving || (!dirty && !isNew)}>
            {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
            {isNew ? "Create teacher" : "Save changes"}
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-danger/25 bg-danger/6 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card title="Basics" description="Who this teacher is.">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field
                label="ID"
                hint={
                  isNew
                    ? "Lowercase letters, numbers and dashes. Can't be changed later."
                    : "Used in links and the API."
                }
              >
                <Input
                  value={draft.id}
                  disabled={!isNew}
                  onChange={(e) => set("id", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="e.g. maya"
                  className="font-mono"
                />
              </Field>
              <Field label="Name">
                <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Maya" />
              </Field>
              <Field label="Role" hint="Completes “You are Maya, …”">
                <Input
                  value={draft.role}
                  onChange={(e) => set("role", e.target.value)}
                  placeholder="a friendly conversation partner"
                />
              </Field>
              <Field label="Specialty">
                <Input
                  value={draft.specialty}
                  onChange={(e) => set("specialty", e.target.value)}
                  placeholder="Everyday conversation"
                />
              </Field>
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
              <Field label="Color">
                <div className="flex flex-wrap items-center gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Color ${color}`}
                      onClick={() => set("color", color)}
                      className={cn(
                        "size-7 rounded-full transition-transform hover:scale-110",
                        draft.color === color && "ring-2 ring-ink ring-offset-2 ring-offset-surface",
                      )}
                      style={{ background: color }}
                    />
                  ))}
                  <Input
                    value={draft.color}
                    onChange={(e) => set("color", e.target.value)}
                    className="w-28 font-mono"
                    aria-label="Hex color"
                  />
                </div>
              </Field>
              <Field label="Order" hint="Lower numbers appear first.">
                <Input type="number" value={draft.order} onChange={(e) => set("order", Number(e.target.value))} />
              </Field>
              <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3 sm:col-span-2">
                <div>
                  <p className="text-sm font-semibold text-ink">Visible to learners</p>
                  <p className="text-xs text-muted">
                    Hidden teachers don&apos;t appear in the app and can&apos;t be chatted with.
                  </p>
                </div>
                <Switch checked={draft.enabled} onChange={(v) => set("enabled", v)} label="Visible to learners" />
              </div>
            </div>
          </Card>

          <Card title="Card and conversation" description="What learners see before and while chatting.">
            <div className="space-y-4 p-5">
              <Field label="Tagline" hint="One line on the teacher card.">
                <Input value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} />
              </Field>
              <Field label="Description" hint="Shown at the top of the conversation.">
                <Textarea rows={2} value={draft.description} onChange={(e) => set("description", e.target.value)} />
              </Field>
              <Field label="Sample line" hint="A short line in the teacher's voice, shown on their card.">
                <Input value={draft.quote} onChange={(e) => set("quote", e.target.value)} />
              </Field>
              <Field label="Goals" hint="Which filters this teacher appears under.">
                <div className="flex flex-wrap gap-1.5">
                  {GOALS.map((goal) => {
                    const on = draft.goals.includes(goal.id);
                    return (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() =>
                          set(
                            "goals",
                            on ? draft.goals.filter((g) => g !== goal.id) : [...draft.goals, goal.id as TeacherGoal],
                          )
                        }
                        className={cn(
                          "h-8 rounded-full border px-3 text-sm transition-colors",
                          on ? "border-ink bg-ink text-bg" : "border-line text-muted hover:text-ink",
                        )}
                      >
                        {goal.label}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Skill tags">
                <ListEditor items={draft.tags} onChange={(v) => set("tags", v)} multiline={false} addLabel="Add tag" />
              </Field>
              <Field label="Conversation starters" hint="Tap-to-send prompts in a new conversation.">
                <ListEditor items={draft.starters} onChange={(v) => set("starters", v)} addLabel="Add starter" />
              </Field>
            </div>
          </Card>

          <Card
            title="AI persona"
            description="How the teacher thinks, teaches and corrects. Sent to the model as the system prompt."
          >
            <div className="space-y-5 p-5">
              <Field label="Background">
                <Textarea
                  rows={3}
                  value={draft.persona.background}
                  onChange={(e) => setPersona("background", e.target.value)}
                />
              </Field>
              <Field label="Personality">
                <ListEditor
                  items={draft.persona.personality}
                  onChange={(v) => setPersona("personality", v)}
                  addLabel="Add trait"
                />
              </Field>
              <Field label="How they teach">
                <ListEditor
                  items={draft.persona.teaching_style}
                  onChange={(v) => setPersona("teaching_style", v)}
                  addLabel="Add teaching rule"
                />
              </Field>
              <Field label="How they correct mistakes">
                <Textarea
                  rows={3}
                  value={draft.persona.correction_style}
                  onChange={(e) => setPersona("correction_style", e.target.value)}
                />
              </Field>
              <Field label="Focus areas">
                <ListEditor
                  items={draft.persona.focus}
                  onChange={(v) => setPersona("focus", v)}
                  addLabel="Add focus area"
                />
              </Field>
              <Field label="Boundaries">
                <ListEditor
                  items={draft.persona.boundaries}
                  onChange={(v) => setPersona("boundaries", v)}
                  addLabel="Add boundary"
                />
              </Field>
              <Field label="Sample phrases" hint="Examples of how they sound.">
                <ListEditor
                  items={draft.persona.sample_phrases}
                  onChange={(v) => setPersona("sample_phrases", v)}
                  addLabel="Add phrase"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Languages" hint="Languages this teacher may use.">
                  <ListEditor
                    items={draft.persona.languages}
                    onChange={(v) => setPersona("languages", v)}
                    multiline={false}
                    addLabel="Add language"
                  />
                </Field>
                <Field
                  label={`Temperature: ${draft.persona.temperature.toFixed(1)}`}
                  hint="Lower is precise, higher is playful."
                >
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.1}
                    value={draft.persona.temperature}
                    onChange={(e) => setPersona("temperature", Number(e.target.value))}
                    className="mt-2 w-full accent-[var(--accent)]"
                  />
                </Field>
              </div>
            </div>
          </Card>

          {!isNew && (
            <div className="flex items-center justify-between rounded-2xl border border-danger/25 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-ink">Delete teacher</p>
                <p className="text-xs text-muted">
                  Removes the teacher for everyone. Past conversations stay in the database.
                </p>
              </div>
              {confirmDelete ? (
                <div className="flex gap-2">
                  <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
                  <Button variant="danger" onClick={() => void remove()} className="border border-danger/40">
                    <Trash2 />
                    Delete {draft.name}
                  </Button>
                </div>
              ) : (
                <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                  <Trash2 />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-6">
          <p className="text-xs font-semibold tracking-wider text-subtle uppercase">Live preview</p>
          <TeacherCard
            teacher={{
              ...draft,
              languages: draft.persona.languages,
              name: draft.name || "New teacher",
              specialty: draft.specialty || "Specialty",
            }}
            onSelect={() => {}}
            className="pointer-events-none !flex-col sm:!flex-row"
          />
          <p className="text-xs leading-relaxed text-subtle">
            This is how the card looks on the landing page and in the app.
          </p>
        </aside>
      </div>

      <Dialog
        open={prompt !== null}
        onClose={() => setPrompt(null)}
        label="System prompt preview"
        className="max-w-3xl"
      >
        <div className="flex items-center justify-between border-b border-line py-3 pr-3 pl-5">
          <div>
            <h2 className="text-[15px] font-semibold">System prompt</h2>
            <p className="text-xs text-muted">Exactly what the model receives: this persona plus the shared rules.</p>
          </div>
          <IconButton label="Close" tooltip={false} onClick={() => setPrompt(null)}>
            <X />
          </IconButton>
        </div>
        <pre className="max-h-[65vh] overflow-auto px-5 py-4 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-ink">
          {prompt}
        </pre>
      </Dialog>
    </>
  );
}
