"use client";

import { Brain, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useLoad } from "@/hooks/useLoad";
import { api, type AdminUser } from "@/lib/api";
import { IconButton } from "../IconButton";
import { memoryIsEmpty, MemoryView } from "../memory/MemoryView";
import { Dialog } from "../ui/Dialog";
import { useToast } from "../ui/Toast";
import { Button, EmptyState, ErrorState, formatDate, LoadingState, PageHeader, timeAgo } from "./ui";

export function UsersTable() {
  const toast = useToast();
  const load = useCallback(() => api.admin.users(), []);
  const { data: users, loading, error, reload, setData } = useLoad(load);
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [viewing, setViewing] = useState<AdminUser | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users ?? [];
    return (users ?? []).filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, query]);

  const remove = async (target: AdminUser) => {
    try {
      await api.admin.deleteUser(target.id);
      setData((list) => list?.filter((u) => u.id !== target.id) ?? null);
      toast({ message: `${target.name}'s account deleted` });
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Couldn't delete the account" });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Learners"
        description={
          users
            ? `${users.length} learner account${users.length === 1 ? "" : "s"}`
            : "Everyone who has signed up to learn."
        }
        actions={
          <label className="flex h-10 w-64 items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-accent/50">
            <Search className="size-4 text-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-subtle"
            />
          </label>
        }
      />

      {loading && !users ? (
        <LoadingState />
      ) : error && !users ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !filtered.length ? (
        <EmptyState title={query ? "No matching learners" : "No learners yet"} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-subtle">
                <th className="px-5 py-3 font-semibold">Learner</th>
                <th className="px-3 py-3 text-right font-semibold">Conversations</th>
                <th className="px-3 py-3 text-right font-semibold">Messages</th>
                <th className="px-3 py-3 font-semibold">Joined</th>
                <th className="px-3 py-3 font-semibold">Last active</th>
                <th className="w-24 px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                return (
                  <tr key={u.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-hover text-xs font-semibold text-ink">
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{u.name}</p>
                          <p className="truncate text-xs text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {u.conversations ? (
                        <Link
                          href={`/admin/conversations?user=${u.id}`}
                          className="font-medium text-ink underline-offset-4 hover:underline"
                        >
                          {u.conversations}
                        </Link>
                      ) : (
                        <span className="text-subtle">0</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-muted tabular-nums">{u.messages}</td>
                    <td className="px-3 py-3 text-muted">{formatDate(u.created_at)}</td>
                    <td className="px-3 py-3 text-muted">{timeAgo(u.last_seen_at)}</td>
                    <td className="px-5 py-3 text-right">
                      <IconButton label={`What teachers remember about ${u.name}`} onClick={() => setViewing(u)}>
                        <Brain />
                      </IconButton>
                      <IconButton label={`Delete ${u.name}`} onClick={() => setDeleting(u)}>
                        <Trash2 />
                      </IconButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={viewing !== null} onClose={() => setViewing(null)} label="Learner memory" className="max-w-xl">
        {viewing && <LearnerMemoryPanel user={viewing} onClose={() => setViewing(null)} />}
      </Dialog>

      <Dialog open={deleting !== null} onClose={() => setDeleting(null)} label="Delete learner" className="max-w-md">
        <div className="p-5">
          <h2 className="text-[15px] font-semibold">Delete {deleting?.name}&apos;s account?</h2>
          <p className="mt-1.5 text-sm text-muted">
            This permanently deletes the account and all of their conversations. It can&apos;t be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              variant="danger"
              className="border border-danger/40"
              onClick={() => deleting && void remove(deleting)}
            >
              Delete account
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function LearnerMemoryPanel({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const load = useCallback(() => api.admin.userMemory(user.id), [user.id]);
  const { data, loading, error } = useLoad(load);

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-line py-3.5 pr-3 pl-5">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">What teachers remember about {user.name}</h2>
          <p className="mt-0.5 text-xs text-muted">
            {data?.memory?.updated_at ? `Updated ${timeAgo(data.memory.updated_at)}` : "Read-only"}
            {data && !data.enabled && " · The learner turned memory off"}
          </p>
        </div>
        <IconButton label="Close" tooltip={false} onClick={onClose}>
          <X />
        </IconButton>
      </div>
      <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
        {loading && !data ? (
          <LoadingState />
        ) : error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : !data?.memory || memoryIsEmpty(data.memory) ? (
          <p className="py-8 text-center text-sm text-muted">Nothing remembered yet.</p>
        ) : (
          <MemoryView memory={data.memory} perspective="admin" />
        )}
      </div>
    </>
  );
}
