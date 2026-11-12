"use client";

import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";
import { useLoad } from "@/hooks/useLoad";
import { api } from "@/lib/api";
import type { AdminTeacher } from "@/lib/teachers";
import { cn } from "@/lib/utils";
import { TeacherAvatar } from "../TeacherAvatar";
import { Switch } from "../ui/Switch";
import { useToast } from "../ui/Toast";
import { EmptyState, ErrorState, LoadingState, PageHeader, timeAgo } from "./ui";

function editable(t: AdminTeacher) {
  const { id: _id, created_at: _c, updated_at: _u, ...rest } = t;
  return rest;
}

export function TeachersList() {
  const toast = useToast();
  const load = useCallback(() => api.admin.teachers(), []);
  const { data: teachers, loading, error, reload, setData } = useLoad(load);

  const toggle = async (teacher: AdminTeacher, online: boolean) => {
    setData((list) => list?.map((t) => (t.id === teacher.id ? { ...t, online } : t)) ?? null);
    try {
      await api.admin.updateTeacher(teacher.id, { ...editable(teacher), online });
      toast({
        message: online
          ? `${teacher.name} is online and will answer any waiting messages`
          : `${teacher.name} is offline. Learners' messages will wait with a single tick`,
      });
    } catch (err) {
      setData((list) => list?.map((t) => (t.id === teacher.id ? teacher : t)) ?? null);
      toast({ message: err instanceof Error ? err.message : "Couldn't update teacher" });
    }
  };

  return (
    <>
      <PageHeader
        title="Teachers"
        description="Every teacher's profile and AI persona, stored in MongoDB."
        actions={
          <Link
            href="/admin/teachers/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink hover:opacity-90"
          >
            <Plus className="size-4" />
            New teacher
          </Link>
        }
      />

      {loading && !teachers ? (
        <LoadingState />
      ) : error && !teachers ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !teachers?.length ? (
        <EmptyState title="No teachers yet" text="Create your first teacher to get started." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          {teachers.map((t, i) => (
            <div
              key={t.id}
              className={cn(
                "flex flex-wrap items-center gap-4 px-5 py-4 sm:flex-nowrap",
                i > 0 && "border-t border-line",
                !t.enabled && "opacity-60",
              )}
            >
              <TeacherAvatar name={t.name} color={t.color} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-semibold text-ink">{t.name}</p>
                  <span className="font-mono text-xs text-subtle">{t.id}</span>
                  {!t.enabled && (
                    <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-muted">
                      Hidden
                    </span>
                  )}
                </div>
                <p className="truncate text-sm" style={{ color: t.color }}>
                  {t.specialty}
                </p>
                <p className="mt-0.5 truncate text-xs text-subtle">
                  {t.level} · {t.voice} voice · {t.persona.languages.join(", ")} · updated {timeAgo(t.updated_at)}
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <span className={cn("size-1.5 rounded-full", t.online ? "bg-success" : "bg-subtle")} aria-hidden />
                  {t.online ? "Online" : "Offline"}
                </span>
                <Switch checked={t.online} onChange={(v) => void toggle(t, v)} label={`${t.name} online`} />
              </label>
              <Link
                href={`/admin/teachers/${t.id}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-medium text-ink transition-colors hover:border-accent/40"
              >
                <Pencil className="size-3.5" />
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
