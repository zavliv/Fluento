"use client";

import { Eye, LoaderCircle, RefreshCw, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLoad } from "@/hooks/useLoad";
import { api, CEFR_LEVELS, LEVEL_NAMES, type CefrLevel, type LevelTest, type LevelTestConfig } from "@/lib/api";
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
        <div className="min-w-0 space-y-5">
          <ConfigForm initial={config} />
          <QuestionBank />
        </div>

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
          <Card title="Insights">
            <dl className="grid grid-cols-2 gap-4 p-5">
              <div>
                <dt className="text-xs text-muted">Average quick check</dt>
                <dd className="mt-1 text-xl font-bold text-ink">
                  {results.average_quiz_score == null ? "–" : `${Math.round(results.average_quiz_score * 100)}%`}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Answers spoken</dt>
                <dd className="mt-1 text-xl font-bold text-ink">
                  {results.spoken_share == null ? "–" : `${Math.round(results.spoken_share * 100)}%`}
                </dd>
              </div>
            </dl>
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

        <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-ink">Quick check quiz</p>
            <p className="text-xs text-muted">
              Part 1: adaptive multiple-choice grammar and vocabulary questions from the question bank.
            </p>
          </div>
          <Switch checked={draft.quiz_enabled} onChange={(v) => set("quiz_enabled", v)} label="Quick check quiz" />
        </div>

        {draft.quiz_enabled && (
          <Field label="Quiz questions" hint="Between 4 and 12.">
            <div className="w-28">
              <Input
                type="number"
                min={4}
                max={12}
                value={draft.quiz_count}
                onChange={(e) => set("quiz_count", Number(e.target.value))}
              />
            </div>
          </Field>
        )}

        <Field label="Conversation questions" hint="Between 3 and 12. More questions give a more reliable result.">
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
          hint="Writes each conversation question. Placeholders: {app}, {name} (learner's first name), {count}, {number} (current question), {start_level} (the quiz estimate)."
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
          hint="How to judge the learner. The required JSON format, teacher list, quiz results and transcript are added automatically."
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
                  {t.quiz_total ? ` · quiz ${t.quiz_correct}/${t.quiz_total}` : ""}
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

function QuestionBank() {
  const toast = useToast();
  const load = useCallback(() => api.admin.quizBank(), []);
  const { data, loading, error, reload, setData } = useLoad(load);
  const [level, setLevel] = useState<CefrLevel>("B1");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!data?.refilling) return;
    const timer = window.setInterval(reload, 8000);
    return () => window.clearInterval(timer);
  }, [data?.refilling, reload]);

  const remove = async (id: string) => {
    setData((d) => (d ? { ...d, questions: d.questions.filter((q) => q.id !== id) } : d));
    try {
      await api.admin.deleteQuizQuestion(id);
      toast({ message: "Question removed. A replacement will be generated." });
    } catch (err) {
      reload();
      toast({ message: err instanceof Error ? err.message : "Couldn't remove the question" });
    }
  };

  const refresh = async () => {
    setConfirming(false);
    try {
      await api.admin.refreshQuizBank();
      toast({ message: "Generating a fresh question bank. This takes a few minutes." });
      reload();
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Couldn't refresh the bank" });
    }
  };

  if (loading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  const shown = data.questions.filter((q) => q.level === level);

  return (
    <Card
      title="Question bank"
      description="Quiz questions are written by AI, then solved again blind; only questions with exactly one correct answer are kept. The bank refills itself."
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
        <div className="flex flex-wrap gap-1">
          {CEFR_LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              className={`h-8 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                l === level ? "bg-ink text-bg" : "text-muted hover:bg-hover hover:text-ink"
              }`}
            >
              {l} <span className="font-normal opacity-70">{data.counts[l]}</span>
            </button>
          ))}
        </div>
        <span className="ml-auto flex items-center gap-2">
          {data.refilling && (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <LoaderCircle className="size-3.5 animate-spin" />
              Adding questions…
            </span>
          )}
          {confirming ? (
            <>
              <Button className="h-8 px-3 text-xs" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                className="h-8 border border-danger/40 px-3 text-xs"
                onClick={() => void refresh()}
              >
                Replace all
              </Button>
            </>
          ) : (
            <Button className="h-8 px-3 text-xs" onClick={() => setConfirming(true)}>
              <RefreshCw />
              Regenerate
            </Button>
          )}
        </span>
      </div>
      {shown.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">No {level} questions yet.</p>
      ) : (
        <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
          {shown.map((q) => (
            <li key={q.id} className="group flex items-start gap-3 px-5 py-3">
              <div className="min-w-0 flex-1 text-sm">
                <p className="text-ink">{q.question}</p>
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                  <span className="text-subtle capitalize">{q.skill}</span>
                  {q.options.map((o, i) => (
                    <span key={o} className={i === q.answer_index ? "font-semibold text-success" : ""}>
                      {o}
                    </span>
                  ))}
                </p>
              </div>
              <IconButton label="Remove question" onClick={() => void remove(q.id)}>
                <Trash2 />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
