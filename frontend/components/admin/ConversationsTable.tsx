"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useLoad } from "@/hooks/useLoad";
import { api } from "@/lib/api";
import { TeacherAvatar } from "../TeacherAvatar";
import { EmptyState, ErrorState, LoadingState, PageHeader, Select, timeAgo } from "./ui";

export function ConversationsTable() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const teacherId = params.get("teacher") ?? "";
  const userId = params.get("user") ?? "";

  const loadTeachers = useCallback(() => api.admin.teachers(), []);
  const { data: teachers } = useLoad(loadTeachers);
  const load = useCallback(
    () => api.admin.conversations({ teacherId: teacherId || undefined, userId: userId || undefined }),
    [teacherId, userId],
  );
  const { data: conversations, loading, error, reload } = useLoad(load);

  const byId = useMemo(() => new Map((teachers ?? []).map((t) => [t.id, t])), [teachers]);
  const userName = userId ? conversations?.[0]?.user_name : null;

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <>
      <PageHeader
        title="Conversations"
        description="Every learner's chats, newest first. Read-only."
        actions={
          <Select value={teacherId} onChange={(e) => setFilter("teacher", e.target.value)} className="w-48">
            <option value="">All teachers</option>
            {teachers?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        }
      />

      {userId && (
        <div className="mb-4 inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface pr-1 pl-3 text-xs text-muted">
          Learner: <span className="font-semibold text-ink">{userName ?? "selected user"}</span>
          <button
            type="button"
            aria-label="Clear learner filter"
            onClick={() => setFilter("user", "")}
            className="flex size-6 items-center justify-center rounded-full hover:bg-hover hover:text-ink"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {loading && !conversations ? (
        <LoadingState />
      ) : error && !conversations ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !conversations?.length ? (
        <EmptyState title="No conversations" text="Conversations appear here once learners start chatting." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          {conversations.map((c, i) => {
            const teacher = byId.get(c.teacher_id);
            return (
              <Link
                key={c.id}
                href={`/admin/conversations/${c.id}`}
                className={`flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-hover ${i > 0 ? "border-t border-line" : ""}`}
              >
                <TeacherAvatar name={teacher?.name ?? c.teacher_id} color={teacher?.color ?? "#64748b"} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-semibold text-ink">{c.user_name}</span>
                    <span className="text-subtle"> with </span>
                    <span className="font-medium text-ink">{teacher?.name ?? c.teacher_id}</span>
                  </p>
                  <p className="truncate text-sm text-muted">{c.last_message || "No messages"}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-muted">{timeAgo(c.updated_at)}</p>
                  <p className="text-xs text-subtle tabular-nums">{c.message_count} messages</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
