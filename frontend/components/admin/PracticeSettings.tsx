"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useCallback, useState } from "react";
import { useLoad } from "@/hooks/useLoad";
import { api, type ProgressConfig } from "@/lib/api";
import { Switch } from "../ui/Switch";
import { useToast } from "../ui/Toast";
import { Button, Card, ErrorState, Field, Input, LoadingState, PageHeader } from "./ui";

type NumberKey = {
  [K in keyof ProgressConfig]: ProgressConfig[K] extends number ? K : never;
}[keyof ProgressConfig];

const GROUPS: { title: string; description: string; fields: [NumberKey, string, string?][] }[] = [
  {
    title: "Challenges",
    description: "The quick check for new learners and the daily 2-minute challenge.",
    fields: [
      ["placement_rounds", "Quick check rounds", "4 to 12"],
      ["daily_rounds", "Daily challenge rounds", "3 to 10, plus one speaking question"],
      ["daily_goal_xp", "Daily goal (XP)"],
      ["check_every_days", "Level check every (days)", "Unlocks earlier when the daily level goes up"],
    ],
  },
  {
    title: "XP",
    description: "Points learners earn.",
    fields: [
      ["xp_correct", "Per correct round"],
      ["xp_hard_bonus", "Bonus for a harder round"],
      ["xp_spoken", "Speaking answer"],
      ["xp_level_check", "Finishing a level check"],
    ],
  },
  {
    title: "Streak freezes",
    description: "A freeze protects the streak when a learner misses a day.",
    fields: [
      ["freeze_every_days", "Earn one every (streak days)"],
      ["max_freezes", "Most a learner can hold"],
    ],
  },
];

export function PracticeSettings() {
  const load = useCallback(() => api.admin.progressConfig(), []);
  const { data, loading, error, reload } = useLoad(load);
  if (loading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  return <Form initial={data} />;
}

function Form({ initial }: { initial: ProgressConfig }) {
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = <K extends keyof ProgressConfig>(key: K, value: ProgressConfig[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const next = await api.admin.saveProgressConfig(draft);
      setSaved(next);
      setDraft(next);
      toast({ message: "Practice settings saved" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Practice"
        description="Daily challenges, streaks, XP, badges and the weekly league."
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
        <Card>
          <div className="divide-y divide-line">
            {(
              [
                ["enabled", "Daily challenges", "When off, learners can't start new challenges."],
                ["league_enabled", "Weekly league", "Opt-in ranking by weekly XP. Shows first name and initial only."],
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
          </div>
        </Card>

        {GROUPS.map((group) => (
          <Card key={group.title} title={group.title} description={group.description}>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {group.fields.map(([key, label, hint]) => (
                <Field key={key} label={label} hint={hint}>
                  <div className="w-32">
                    <Input type="number" value={draft[key]} onChange={(e) => set(key, Number(e.target.value))} />
                  </div>
                </Field>
              ))}
            </div>
          </Card>
        ))}

        <Card title="Speaking grader" description="Grades the speaking answer in each daily challenge.">
          <div className="p-5">
            <Field label="Model" hint="A smaller model saves your main model's quota.">
              <Input
                value={draft.speaking_model}
                onChange={(e) => set("speaking_model", e.target.value)}
                className="font-mono"
              />
            </Field>
          </div>
        </Card>
      </div>
    </>
  );
}
