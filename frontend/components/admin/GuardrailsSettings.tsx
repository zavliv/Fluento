"use client";

import { Check, LoaderCircle, MessagesSquare, RotateCcw, Save } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useLoad } from "@/hooks/useLoad";
import { api, type GuardrailsConfig, type GuardrailsSummary, type SafetyFlag } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Switch } from "../ui/Switch";
import { useToast } from "../ui/Toast";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, LoadingState, PageHeader, Textarea } from "./ui";

const CATEGORIES: Record<SafetyFlag["category"], { label: string; color: string }> = {
  harmful: { label: "Harmful", color: "#dc2626" },
  self_harm: { label: "Self-harm", color: "#c026d3" },
  jailbreak: { label: "Jailbreak", color: "#ea580c" },
  off_topic: { label: "Off-topic", color: "#0284c7" },
};

const ACTIONS: Record<SafetyFlag["action"], string> = {
  blocked: "Blocked with a safe reply",
  steered: "Teacher steered back to English",
  allowed: "Allowed",
};

export function GuardrailsSettings() {
  const load = useCallback(() => api.admin.guardrailsConfig(), []);
  const { data, loading, error, reload } = useLoad(load);
  if (loading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  return <Page initial={data} />;
}

function Page({ initial }: { initial: GuardrailsConfig }) {
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = <K extends keyof GuardrailsConfig>(key: K, value: GuardrailsConfig[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const next = await api.admin.saveGuardrailsConfig(draft);
      setSaved(next);
      setDraft(next);
      toast({ message: "Guardrails saved" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Guardrails"
        description="Usage limits, the safety check on learner messages, and messages flagged for review."
        actions={
          <>
            {dirty && (
              <Button onClick={() => setDraft(saved)} disabled={saving}>
                Discard
              </Button>
            )}
            <Button variant="primary" onClick={() => void save()} disabled={!dirty || saving}>
              {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
              Save settings
            </Button>
          </>
        }
      />
      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-danger/25 bg-danger/6 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <Flags dailyLimit={saved.daily_messages} />

      <div className="mt-8 grid max-w-5xl gap-5 lg:grid-cols-2">
        <Card title="Usage limits" description="Protects your AI quota from heavy or automated use.">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Messages per learner per day" hint="0 means no limit. Resets at midnight UTC.">
              <div className="w-32">
                <Input
                  type="number"
                  min={0}
                  value={draft.daily_messages}
                  onChange={(e) => set("daily_messages", Number(e.target.value))}
                />
              </div>
            </Field>
            <Field label="Longest message (characters)" hint="Longer messages are rejected before reaching the AI.">
              <div className="w-32">
                <Input
                  type="number"
                  min={100}
                  value={draft.max_message_chars}
                  onChange={(e) => set("max_message_chars", Number(e.target.value))}
                />
              </div>
            </Field>
          </div>
        </Card>

        <Card title="Safety check" description="A quick AI check on each learner message before the teacher replies.">
          <div className="divide-y divide-line">
            {(
              [
                [
                  "safety_check",
                  "Check learner messages",
                  "Blocks harmful and jailbreak messages and answers self-harm with support.",
                ],
                [
                  "steer_off_topic",
                  "Steer off-topic requests",
                  "When a learner asks for homework, code or advice, the teacher turns it into English practice.",
                ],
              ] as const
            ).map(([key, label, hint]) => (
              <div key={key} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-ink">{label}</p>
                  <p className="text-xs text-muted">{hint}</p>
                </div>
                <Switch checked={draft[key]} onChange={(v) => set(key, v)} label={label} />
              </div>
            ))}
            <div className="px-5 py-4">
              <Field label="Model" hint="A small, fast model keeps the check quick and saves quota.">
                <Input
                  value={draft.safety_model}
                  onChange={(e) => set("safety_model", e.target.value)}
                  className="font-mono"
                />
              </Field>
            </div>
          </div>
        </Card>

        <Card
          title="Safe replies"
          description="What the teacher says instead of answering a blocked message."
          className="lg:col-span-2"
        >
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            <Field label="Harmful or jailbreak message">
              <Textarea rows={4} value={draft.block_reply} onChange={(e) => set("block_reply", e.target.value)} />
            </Field>
            <Field label="Self-harm message" hint="Keep it warm, and point to people who can help.">
              <Textarea
                rows={4}
                value={draft.self_harm_reply}
                onChange={(e) => set("self_harm_reply", e.target.value)}
              />
            </Field>
          </div>
        </Card>
      </div>
    </>
  );
}

function Flags({ dailyLimit }: { dailyLimit: number }) {
  const toast = useToast();
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(() => api.admin.guardrailsSummary(reviewed), [reviewed]);
  const { data, loading, error, reload } = useLoad<GuardrailsSummary>(load);

  const mark = async (flag: SafetyFlag) => {
    setBusy(flag.id);
    try {
      await api.admin.reviewFlag(flag.id, !flag.reviewed);
      reload();
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Couldn't update the flag." });
    } finally {
      setBusy(null);
    }
  };

  const week = data ? Object.values(data.flags_week).reduce((a, b) => a + b, 0) : 0;
  const stats = data
    ? [
        { label: "Messages today", value: data.messages_today },
        { label: "Learners chatting today", value: data.learners_today },
        { label: "At the daily limit", value: dailyLimit ? data.at_limit_today : "No limit" },
        { label: "Flags this week", value: week },
      ]
    : [];

  return (
    <div className="max-w-5xl">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-surface px-4 py-3.5">
            <p className="text-xs font-medium text-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-bold tracking-[-0.02em] text-ink tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-ink">Flagged messages</h2>
        <div className="flex rounded-xl border border-line bg-surface p-1 text-sm">
          {[
            { value: false, label: `To review${data && !reviewed ? ` · ${data.open_flags}` : ""}` },
            { value: true, label: "Reviewed" },
          ].map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => setReviewed(tab.value)}
              className={cn(
                "h-8 rounded-lg px-3 font-medium transition-colors",
                reviewed === tab.value ? "bg-hover text-ink" : "text-muted hover:text-ink",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        {loading && !data ? (
          <LoadingState />
        ) : error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data?.flags.length ? (
          <EmptyState
            title={reviewed ? "Nothing reviewed yet" : "Nothing to review"}
            text={
              reviewed
                ? "Flags you mark as reviewed appear here."
                : "Messages the safety check flags appear here, newest first."
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {data.flags.map((flag) => {
              const category = CATEGORIES[flag.category] ?? { label: flag.category, color: "#64748b" };
              return (
                <li key={flag.id} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge color={category.color}>{category.label}</Badge>
                    <span className="text-muted">{ACTIONS[flag.action]}</span>
                    <span className="text-subtle">·</span>
                    <span className="text-muted">{new Date(flag.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-2.5 rounded-xl bg-hover/60 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap text-ink">
                    {flag.message}
                  </p>
                  {flag.reason && <p className="mt-2 text-xs text-muted">Why: {flag.reason}</p>}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-xs text-muted">
                      <span className="font-semibold text-ink">{flag.user_name}</span>
                      {flag.user_email && ` · ${flag.user_email}`} · to {flag.teacher_name}
                    </p>
                    <div className="flex gap-2">
                      {flag.conversation_id && (
                        <Link
                          href={`/admin/conversations/${flag.conversation_id}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold text-ink transition-colors hover:bg-hover"
                        >
                          <MessagesSquare className="size-3.5" />
                          Conversation
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => void mark(flag)}
                        disabled={busy === flag.id}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold text-ink transition-colors hover:bg-hover disabled:opacity-60"
                      >
                        {busy === flag.id ? (
                          <LoaderCircle className="size-3.5 animate-spin" />
                        ) : flag.reviewed ? (
                          <RotateCcw className="size-3.5" />
                        ) : (
                          <Check className="size-3.5" />
                        )}
                        {flag.reviewed ? "Reopen" : "Mark reviewed"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
