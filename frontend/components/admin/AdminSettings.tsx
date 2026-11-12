"use client";

import { Info } from "lucide-react";
import { TEACHERS } from "@/lib/teachers";
import { Switch } from "../ui/Switch";
import { Button, Card, Field, Input, PageHeader, Select } from "./ui";

export function AdminSettings() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Model, voice and app configuration."
        actions={
          <Button variant="primary" disabled>
            Save changes
          </Button>
        }
      />

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-accent/25 bg-accent-soft/60 px-4 py-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-accent" />
        <p className="text-ink">
          These settings are read-only for now. They mirror <code className="font-mono text-[13px]">backend/.env</code>{" "}
          and will become editable once the admin API is connected.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Language model" description="The model that powers every teacher.">
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Provider">
                <Input value="Groq" disabled readOnly />
              </Field>
              <Field label="Model">
                <Input value="openai/gpt-oss-120b" disabled readOnly className="font-mono text-[13px]" />
              </Field>
            </div>
            <Field label="Temperature" hint="Lower is more focused, higher is more creative.">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  defaultValue={0.3}
                  disabled
                  className="w-full accent-[var(--accent)]"
                />
                <span className="w-8 text-right font-mono text-sm text-muted">0.3</span>
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Max tokens per reply">
                <Input value="4096" disabled readOnly />
              </Field>
              <Field label="History limit" hint="Past messages sent to the model.">
                <Input value="40" disabled readOnly />
              </Field>
            </div>
          </div>
        </Card>

        <Card title="Voice" description="Speaking and listening.">
          <div className="space-y-4 p-5">
            <Field label="Live dictation">
              <Input value="Browser speech recognition" disabled readOnly />
            </Field>
            <Field label="Fallback speech-to-text model">
              <Input value="whisper-large-v3-turbo" disabled readOnly className="font-mono text-[13px]" />
            </Field>
            <Row title="Read replies aloud automatically" description="Teachers speak every reply." checked={false} />
          </div>
        </Card>

        <Card title="Learning experience" description="Defaults for new learners." className="lg:col-span-2">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="App name">
              <Input value="Fluento" disabled readOnly />
            </Field>
            <Field label="Default teacher">
              <Select defaultValue="maya" disabled>
                {TEACHERS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.specialty}
                  </option>
                ))}
              </Select>
            </Field>
            <Row
              title="Allow switching teachers mid-chat"
              description="Learners can change teacher in a conversation."
              checked
            />
            <Row title="Show correction cards" description="Highlight mistakes under learner messages." checked />
          </div>
        </Card>
      </div>
    </>
  );
}

function Row({ title, description, checked }: { title: string; description: string; checked: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
      <Switch checked={checked} label={title} disabled />
    </div>
  );
}
