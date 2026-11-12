"use client";

import { LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useToast } from "../ui/Toast";
import { useAdminAuth } from "./AdminAuthProvider";
import { Button, Card, Field, Input, PageHeader, formatDate } from "./ui";

export function AccountPage() {
  const { admin } = useAdminAuth();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!admin) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      setError("The new passwords don't match.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.admin.changePassword({ current_password: current, new_password: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      toast({ message: "Password changed" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change your password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Your account" description="Your admin team account." />
      <div className="max-w-xl space-y-5">
        <Card>
          <dl className="grid grid-cols-[120px_1fr] gap-y-3 p-5 text-sm">
            <dt className="text-muted">Name</dt>
            <dd className="font-medium text-ink">{admin.name}</dd>
            <dt className="text-muted">Email</dt>
            <dd className="font-medium text-ink">{admin.email}</dd>
            <dt className="text-muted">Role</dt>
            <dd className="font-medium text-ink capitalize">{admin.role}</dd>
            <dt className="text-muted">Member since</dt>
            <dd className="font-medium text-ink">{formatDate(admin.created_at)}</dd>
          </dl>
        </Card>

        <Card title="Change password">
          <form onSubmit={submit} className="space-y-4 p-5">
            <Field label="Current password">
              <Input
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </Field>
            <Field label="New password" hint="At least 8 characters.">
              <Input
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </Field>
            <Field label="Confirm new password">
              <Input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-danger/25 bg-danger/6 px-3.5 py-2.5 text-sm text-danger"
              >
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" disabled={saving || !current || next.length < 8 || !confirm}>
              {saving && <LoaderCircle className="animate-spin" />}
              Change password
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
