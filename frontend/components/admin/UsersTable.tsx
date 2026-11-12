"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useLoad } from "@/hooks/useLoad";
import { api, type AdminUser, type User } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "../auth/AuthProvider";
import { useToast } from "../ui/Toast";
import { EmptyState, ErrorState, formatDate, LoadingState, PageHeader, timeAgo } from "./ui";

export function UsersTable() {
  const { user: me } = useAuth();
  const toast = useToast();
  const load = useCallback(() => api.admin.users(), []);
  const { data: users, loading, error, reload, setData } = useLoad(load);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users ?? [];
    return (users ?? []).filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, query]);

  const setRole = async (target: AdminUser, role: User["role"]) => {
    setData((list) => list?.map((u) => (u.id === target.id ? { ...u, role } : u)) ?? null);
    try {
      await api.admin.setRole(target.id, role);
      toast({ message: `${target.name} is now ${role === "admin" ? "an admin" : "a learner"}` });
    } catch (err) {
      setData((list) => list?.map((u) => (u.id === target.id ? target : u)) ?? null);
      toast({ message: err instanceof Error ? err.message : "Couldn't change the role" });
    }
  };

  return (
    <>
      <PageHeader
        title="Users"
        description={users ? `${users.length} account${users.length === 1 ? "" : "s"}` : "Everyone who has signed up."}
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
        <EmptyState title={query ? "No matching users" : "No users yet"} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-subtle">
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-3 py-3 font-semibold">Role</th>
                <th className="px-3 py-3 text-right font-semibold">Conversations</th>
                <th className="px-3 py-3 text-right font-semibold">Messages</th>
                <th className="px-3 py-3 font-semibold">Joined</th>
                <th className="px-5 py-3 font-semibold">Last active</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const self = u.id === me?.id;
                return (
                  <tr key={u.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-hover text-xs font-semibold text-ink">
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">
                            {u.name}
                            {self && <span className="ml-1.5 text-xs font-normal text-subtle">(you)</span>}
                          </p>
                          <p className="truncate text-xs text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={u.role}
                        disabled={self}
                        title={self ? "You can't change your own role" : undefined}
                        onChange={(e) => void setRole(u, e.target.value as User["role"])}
                        className={cn(
                          "h-8 cursor-pointer rounded-lg border border-line bg-surface px-2 text-xs font-semibold outline-none disabled:cursor-not-allowed disabled:opacity-60",
                          u.role === "admin" ? "text-accent" : "text-ink",
                        )}
                      >
                        <option value="learner">Learner</option>
                        <option value="admin">Admin</option>
                      </select>
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
                    <td className="px-5 py-3 text-muted">{timeAgo(u.last_seen_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
