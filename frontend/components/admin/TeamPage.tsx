"use client";

import { LoaderCircle, Trash2, UserPlus, X } from "lucide-react";
import { useCallback, useState, type FormEvent } from "react";
import { useLoad } from "@/hooks/useLoad";
import { api, type AdminAccount, type AdminRole } from "@/lib/api";
import { cn } from "@/lib/utils";
import { IconButton } from "../IconButton";
import { Dialog } from "../ui/Dialog";
import { useToast } from "../ui/Toast";
import { useAdminAuth } from "./AdminAuthProvider";
import { Button, ErrorState, Field, Input, LoadingState, PageHeader, Select, formatDate, timeAgo } from "./ui";

const ROLES: { id: AdminRole; label: string; text: string }[] = [
  { id: "owner", label: "Owner", text: "Everything, including adding and removing team members." },
  {
    id: "admin",
    label: "Admin",
    text: "Teachers, rules, settings, learners and conversations. Can't manage the team.",
  },
];

export function TeamPage() {
  const { admin: me } = useAdminAuth();
  const toast = useToast();
  const load = useCallback(() => api.admin.team(), []);
  const { data: team, loading, error, reload, setData } = useLoad(load);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<AdminAccount | null>(null);
  const isOwner = me?.role === "owner";

  const setRole = async (member: AdminAccount, role: AdminRole) => {
    setData((list) => list?.map((m) => (m.id === member.id ? { ...m, role } : m)) ?? null);
    try {
      await api.admin.setMemberRole(member.id, role);
      toast({ message: `${member.name} is now ${role === "owner" ? "an owner" : "an admin"}` });
    } catch (err) {
      setData((list) => list?.map((m) => (m.id === member.id ? member : m)) ?? null);
      toast({ message: err instanceof Error ? err.message : "Couldn't change the role" });
    }
  };

  const remove = async (member: AdminAccount) => {
    try {
      await api.admin.removeMember(member.id);
      setData((list) => list?.filter((m) => m.id !== member.id) ?? null);
      toast({ message: `${member.name} removed from the team` });
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Couldn't remove the member" });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Team"
        description="People who can sign in to this admin panel. Separate from learner accounts."
        actions={
          isOwner && (
            <Button variant="primary" onClick={() => setAdding(true)}>
              <UserPlus />
              Add member
            </Button>
          )
        }
      />

      {!isOwner && (
        <p className="mb-4 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
          Only owners can add, change or remove team members.
        </p>
      )}

      {loading && !team ? (
        <LoadingState />
      ) : error && !team ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-subtle">
                <th className="px-5 py-3 font-semibold">Member</th>
                <th className="px-3 py-3 font-semibold">Role</th>
                <th className="px-3 py-3 font-semibold">Added</th>
                <th className="px-3 py-3 font-semibold">Last sign in</th>
                <th className="w-12 px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {team?.map((m) => {
                const self = m.id === me?.id;
                const editable = isOwner && !self;
                return (
                  <tr key={m.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-bg">
                          {m.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">
                            {m.name}
                            {self && <span className="ml-1.5 text-xs font-normal text-subtle">(you)</span>}
                          </p>
                          <p className="truncate text-xs text-muted">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {editable ? (
                        <select
                          value={m.role}
                          onChange={(e) => void setRole(m, e.target.value as AdminRole)}
                          className="h-8 cursor-pointer rounded-lg border border-line bg-surface px-2 text-xs font-semibold text-ink outline-none"
                        >
                          {ROLES.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold capitalize",
                            m.role === "owner" ? "border-ink/20 text-ink" : "border-line text-muted",
                          )}
                        >
                          {m.role}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted">{formatDate(m.created_at)}</td>
                    <td className="px-3 py-3 text-muted">{m.last_seen_at ? timeAgo(m.last_seen_at) : "Never"}</td>
                    <td className="px-5 py-3 text-right">
                      {editable && (
                        <IconButton label={`Remove ${m.name}`} onClick={() => setRemoving(m)}>
                          <Trash2 />
                        </IconButton>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {ROLES.map((r) => (
          <div key={r.id} className="rounded-2xl border border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">{r.label}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">{r.text}</p>
          </div>
        ))}
      </div>

      <AddMemberDialog
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={(member) => {
          setData((list) => [...(list ?? []), member]);
          toast({ message: `${member.name} added. Share their password with them securely.` });
        }}
      />

      <Dialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        label="Remove team member"
        className="max-w-md"
      >
        <div className="p-5">
          <h2 className="text-[15px] font-semibold">Remove {removing?.name}?</h2>
          <p className="mt-1.5 text-sm text-muted">
            They&apos;ll be signed out right away and won&apos;t be able to sign in to the admin panel again.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button onClick={() => setRemoving(null)}>Cancel</Button>
            <Button
              variant="danger"
              className="border border-danger/40"
              onClick={() => removing && void remove(removing)}
            >
              Remove
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function AddMemberDialog({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (member: AdminAccount) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("admin");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole("admin");
    setError(null);
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      onAdded(await api.admin.addMember({ name, email, password, role }));
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add the member.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} label="Add team member" className="max-w-md">
      <div className="flex items-center justify-between border-b border-line py-3 pr-3 pl-5">
        <h2 className="text-[15px] font-semibold">Add team member</h2>
        <IconButton label="Close" tooltip={false} onClick={close}>
          <X />
        </IconButton>
      </div>
      <form onSubmit={submit} className="space-y-4 p-5">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Temporary password" hint="At least 8 characters. They can change it from their account page.">
          <Input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="off"
            className="font-mono"
          />
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
        {error && (
          <p role="alert" className="rounded-xl border border-danger/25 bg-danger/6 px-3.5 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={close}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving || !name || !email || password.length < 8}>
            {saving && <LoaderCircle className="animate-spin" />}
            Add member
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
