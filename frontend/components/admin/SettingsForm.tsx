"use client";

import { LoaderCircle, Play, Save, Square } from "lucide-react";
import { useCallback, useState } from "react";
import { useLoad } from "@/hooks/useLoad";
import { api, previewVoice, type AppSettings } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AdminTeacher } from "@/lib/teachers";
import { Switch } from "../ui/Switch";
import { useToast } from "../ui/Toast";
import { Button, Card, ErrorState, Field, Input, LoadingState, PageHeader, Select } from "./ui";

export function SettingsForm() {
  const load = useCallback(() => Promise.all([api.admin.settings(), api.admin.teachers()]), []);
  const { data, loading, error, reload } = useLoad(load);

  if (loading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  return <Form initial={data[0]} teachers={data[1]} />;
}

function Form({ initial, teachers }: { initial: AppSettings; teachers: AdminTeacher[] }) {
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const next = await api.admin.saveSettings(draft);
      setSaved(next);
      setDraft(next);
      toast({ message: "Settings saved. They apply to the next message." });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="App-wide settings, stored in MongoDB and applied without a restart."
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

      <div className="max-w-3xl space-y-5">
        <Card title="General">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="App name" hint="Also used as a hint for speech recognition.">
              <Input value={draft.app_name} onChange={(e) => set("app_name", e.target.value)} />
            </Field>
            <Field label="Default teacher" hint="Suggested first to new learners.">
              <Select value={draft.default_teacher_id} onChange={(e) => set("default_teacher_id", e.target.value)}>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.enabled ? "" : " (hidden)"}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3 sm:col-span-2">
              <div>
                <p className="text-sm font-semibold text-ink">Allow new sign-ups</p>
                <p className="text-xs text-muted">When off, only existing accounts can log in.</p>
              </div>
              <Switch
                checked={draft.signup_enabled}
                onChange={(v) => set("signup_enabled", v)}
                label="Allow new sign-ups"
              />
            </div>
          </div>
        </Card>

        <Card title="Language model" description="Used for every teacher reply, through Groq.">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Model">
              <Input value={draft.llm_model} onChange={(e) => set("llm_model", e.target.value)} className="font-mono" />
            </Field>
            <Field label="Max reply tokens">
              <Input
                type="number"
                min={256}
                max={32768}
                value={draft.llm_max_tokens}
                onChange={(e) => set("llm_max_tokens", Number(e.target.value))}
              />
            </Field>
            <Field
              label={`Fallback temperature: ${draft.llm_temperature.toFixed(1)}`}
              hint="Used when a teacher has no temperature of their own."
            >
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.1}
                value={draft.llm_temperature}
                onChange={(e) => set("llm_temperature", Number(e.target.value))}
                className="mt-2 w-full accent-[var(--accent)]"
              />
            </Field>
            <Field label="History limit" hint="How many recent messages are sent to the model.">
              <Input
                type="number"
                min={2}
                max={200}
                value={draft.history_limit}
                onChange={(e) => set("history_limit", Number(e.target.value))}
              />
            </Field>
          </div>
        </Card>

        <Card
          title="Learner memory"
          description="Teachers remember each learner's goals, interests and recurring mistakes."
        >
          <div className="p-5">
            <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">Remember learners between conversations</p>
                <p className="text-xs text-muted">
                  Updated in the background every few messages. Learners can view, edit or turn off their own memory.
                </p>
              </div>
              <Switch
                checked={draft.memory_enabled}
                onChange={(v) => set("memory_enabled", v)}
                label="Remember learners between conversations"
              />
            </div>
          </div>
        </Card>

        <Card
          title="Mistake tracker"
          description="Each learner message is checked for English mistakes in the background."
        >
          <div className="p-5">
            <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">Track learners&apos; mistakes</p>
                <p className="text-xs text-muted">
                  Saved mistakes appear on each learner&apos;s My mistakes page. Uses one extra model call per message.
                </p>
              </div>
              <Switch
                checked={draft.mistakes_enabled}
                onChange={(v) => set("mistakes_enabled", v)}
                label="Track learners' mistakes"
              />
            </div>
          </div>
        </Card>

        <Card title="Speech to text" description="Used when the browser can't transcribe speech itself.">
          <div className="p-5">
            <Field label="Whisper model">
              <Input value={draft.stt_model} onChange={(e) => set("stt_model", e.target.value)} className="font-mono" />
            </Field>
          </div>
        </Card>

        <Card
          title="Platform voice"
          description="One voice for the whole platform: reading replies aloud, the level test, daily challenges and Voice."
        >
          <div className="p-5">
            <VoicePicker
              value={draft.tts_voice}
              model={draft.tts_model}
              onChange={(voice) => set("tts_voice", voice)}
            />
            <div className="mt-5 max-w-sm">
              <Field label="Voice model">
                <Input
                  value={draft.tts_model}
                  onChange={(e) => set("tts_model", e.target.value)}
                  className="font-mono"
                />
              </Field>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

const VOICES = [
  { id: "hannah", name: "Hannah", tone: "Female · warm" },
  { id: "diana", name: "Diana", tone: "Female · clear" },
  { id: "autumn", name: "Autumn", tone: "Female · soft" },
  { id: "troy", name: "Troy", tone: "Male · friendly" },
  { id: "daniel", name: "Daniel", tone: "Male · calm" },
  { id: "austin", name: "Austin", tone: "Male · bright" },
];

let previewAudio: HTMLAudioElement | null = null;

function VoicePicker({ value, model, onChange }: { value: string; model: string; onChange: (voice: string) => void }) {
  const toast = useToast();
  const [playing, setPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const stop = () => {
    previewAudio?.pause();
    setPlaying(null);
  };

  const preview = async (voice: string) => {
    if (playing === voice) return stop();
    stop();
    setLoading(voice);
    try {
      const url = URL.createObjectURL(await previewVoice(voice, model));
      previewAudio ??= new Audio();
      previewAudio.src = url;
      previewAudio.onended = () => setPlaying(null);
      await previewAudio.play();
      setPlaying(voice);
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Couldn't play the preview." });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Platform voice">
      {VOICES.map((voice) => {
        const on = voice.id === value;
        return (
          <div
            key={voice.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 transition-colors",
              on ? "border-accent bg-accent-soft/50" : "border-line hover:border-accent/40",
            )}
          >
            <button
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(voice.id)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  on ? "border-accent" : "border-line",
                )}
              >
                {on && <span className="size-2.5 rounded-full bg-accent" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{voice.name}</span>
                <span className="block text-xs text-muted">{voice.tone}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => void preview(voice.id)}
              aria-label={playing === voice.id ? `Stop ${voice.name}` : `Play ${voice.name}`}
              title={playing === voice.id ? "Stop" : "Play a sample"}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line text-ink transition-colors hover:bg-hover"
            >
              {loading === voice.id ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : playing === voice.id ? (
                <Square className="size-3.5 fill-current" />
              ) : (
                <Play className="size-3.5 fill-current" />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
