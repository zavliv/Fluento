"use client";

import { Eye, LoaderCircle, RotateCcw, Save, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useLoad } from "@/hooks/useLoad";
import { api, CEFR_LEVELS, LEVEL_NAMES, type LevelTest, type LevelTestConfig } from "@/lib/api";
import { IconButton } from "../IconButton";
import { Dialog } from "../ui/Dialog";
import { Switch } from "../ui/Switch";
import { useToast } from "../ui/Toast";
import { Button, Card, EmptyState, ErrorState, Field, Input, LoadingState, PageHeader, Textarea, timeAgo } from "./ui";

export function LevelTestAdmin() {
  const load = useCallback(
    () => Promise.all([api.admin.levelTestConfig(), api.admin.levelTests(), api.admin.teachers()]),
    [],
  );
  const { data, loading, error, reload } = useLoad(load);

  if (loading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  const [config, results, teachers] = data;
  const names = Object.fromEntries(teachers.map((t) => [t.id, t.name]));
  const total = Object.values(results.distribution).reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...Object.values(results.distribution));

  return (
    <>
      <PageHeader
        title="Level test"
        description="A short placement chat that grades learners on the CEFR scale. Teachers adapt to each learner's result."
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ConfigForm initial={config} />

        <div className="space-y-5">
          <Card title="Learner levels" description={`Latest result for ${total} learner${total === 1 ? "" : "s"}`}>
            <ul className="space-y-2.5 p-5">
              {CEFR_LEVELS.map((level) => (
                <li key={level} className="flex items-center gap-3 text-sm">
                  <span className="w-7 font-semibold text-ink">{level}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-hover">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${(results.distribution[level] / max) * 100}%` }}
                    />
                  </span>
                  <span className="w-6 text-right text-muted tabular-nums">{results.distribution[level]}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Results tests={results.tests} names={names} />
        </div>
      </div>
    </>
  );
}

function ConfigForm({ initial }: { initial: LevelTestConfig }) {
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = <K extends keyof LevelTestConfig>(key: K, value: LevelTestConfig[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const run = async (action: () => Promise<LevelTestConfig>, message: string) => {
    setSaving(true);
    setError(null);
    try {
      const next = await action();
      setSaved(next);
      setDraft(next);
      toast({ message });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Test settings" description="Changes apply to the next test a learner starts.">
      <div className="space-y-5 p-5">
        <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-ink">Level test available</p>
            <p className="text-xs text-muted">
              When off, learners can still see past results but can&apos;t start a test.
            </p>
          </div>
          <Switch checked={draft.enabled} onChange={(v) => set("enabled", v)} label="Level test available" />
        </div>

        <Field label="Number of questions" hint="Between 3 and 12. More questions give a more reliable result.">
          <div className="w-28">
            <Input
              type="number"
              min={3}
              max={12}
              value={draft.question_count}
              onChange={(e) => set("question_count", Number(e.target.value))}
            />
          </div>
        </Field>

        <Field
          label="Examiner prompt"
          hint="Writes each question. Placeholders: {app}, {name} (learner's first name), {count}, {number} (current question)."
        >
          <Textarea
            rows={12}
            value={draft.examiner_prompt}
            onChange={(e) => set("examiner_prompt", e.target.value)}
            className="font-mono text-[12.5px]"
          />
        </Field>

        <Field
          label="Grading prompt"
          hint="Grades the finished chat and must ask for the JSON keys shown. Placeholder: {teachers} (visible teachers, for the recommendation)."
        >
          <Textarea
            rows={14}
            value={draft.grading_prompt}
            onChange={(e) => set("grading_prompt", e.target.value)}
            className="font-mono text-[12.5px]"
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-xl border border-danger/25 bg-danger/6 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            onClick={() => void run(() => api.admin.resetLevelTestConfig(), "Restored the default test settings")}
            disabled={saving}
          >
            <RotateCcw />
            Restore defaults
          </Button>
          <div className="flex gap-2">
            {dirty && (
              <Button onClick={() => setDraft(saved)} disabled={saving}>
                Discard
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => void run(() => api.admin.saveLevelTestConfig(draft), "Level test settings saved")}
              disabled={!dirty || saving}
            >
              {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
              Save settings
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Results({
  tests,
  names,
}: {
  tests: Awaited<ReturnType<typeof api.admin.levelTests>>["tests"];
  names: Record<string, string>;
}) {
  const [open, setOpen] = useState<LevelTest | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const view = async (id: string) => {
    setOpening(id);
    try {
      setOpen(await api.admin.levelTestDetail(id));
    } finally {
      setOpening(null);
    }
  };

  return (
    <Card title="Recent results">
      {tests.length === 0 ? (
        <div className="p-5">
          <EmptyState title="No tests yet" text="Results appear here when learners finish the level test." />
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {tests.slice(0, 30).map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-5 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-sm font-bold text-accent">
                {t.level}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{t.user_name}</p>
                <p className="truncate text-xs text-muted">
                  {timeAgo(t.completed_at)}
                  {t.recommended_teacher_id &&
                    ` · matched with ${names[t.recommended_teacher_id] ?? t.recommended_teacher_id}`}
                </p>
              </div>
              <IconButton label={`View ${t.user_name}'s test`} onClick={() => void view(t.id)}>
                {opening === t.id ? <LoaderCircle className="animate-spin" /> : <Eye />}
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open !== null} onClose={() => setOpen(null)} label="Level test transcript" className="max-w-2xl">
        {open?.result && (
          <>
            <div className="flex items-center justify-between border-b border-line py-3 pr-3 pl-5">
              <div>
                <h2 className="text-[15px] font-semibold">
                  {open.result.level} · {LEVEL_NAMES[open.result.level]}
                </h2>
                <p className="text-xs text-muted">
                  Grammar {open.result.scores.grammar} · Vocabulary {open.result.scores.vocabulary} · Fluency{" "}
                  {open.result.scores.fluency} · Understanding {open.result.scores.comprehension}
                </p>
              </div>
              <IconButton label="Close" tooltip={false} onClick={() => setOpen(null)}>
                <X />
              </IconButton>
            </div>
            <div className="max-h-[65vh] space-y-3 overflow-y-auto px-5 py-4 text-sm">
              <p className="rounded-xl bg-hover px-3.5 py-2.5 leading-relaxed text-ink">{open.result.summary}</p>
              {open.messages.map((m, i) => (
                <p key={i} className="leading-relaxed">
                  <span className="font-semibold text-ink">{m.role === "examiner" ? "Examiner" : "Learner"}: </span>
                  <span className={m.role === "examiner" ? "text-muted" : "text-ink"}>{m.content}</span>
                </p>
              ))}
            </div>
          </>
        )}
      </Dialog>
    </Card>
  );
}
