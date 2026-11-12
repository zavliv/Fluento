"use client";

import { MessageSquare, MessagesSquare, ThumbsUp, Users } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";
import { useLoad } from "@/hooks/useLoad";
import { api } from "@/lib/api";
import { TeacherAvatar } from "../TeacherAvatar";
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, timeAgo } from "./ui";

export function Overview() {
  const load = useCallback(() => Promise.all([api.admin.stats(), api.admin.teachers()]), []);
  const { data, loading, error, reload } = useLoad(load);

  if (loading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const [stats, teachers] = data;
  const byId = Object.fromEntries(teachers.map((t) => [t.id, t]));
  const rated = stats.feedback_up + stats.feedback_down;
  const maxMessages = Math.max(1, ...stats.teacher_usage.map((u) => u.messages));

  const cards = [
    { label: "Learners", value: stats.learners, note: `${stats.new_learners_7d} new this week`, icon: Users },
    {
      label: "Conversations",
      value: stats.conversations,
      note: `${stats.active_conversations_7d} active this week`,
      icon: MessagesSquare,
    },
    { label: "Messages", value: stats.messages, note: "across all conversations", icon: MessageSquare },
    {
      label: "Helpful replies",
      value: rated ? `${Math.round((stats.feedback_up / rated) * 100)}%` : "—",
      note: rated ? `${stats.feedback_up} 👍 · ${stats.feedback_down} 👎` : "No ratings yet",
      icon: ThumbsUp,
    },
  ];

  return (
    <>
      <PageHeader title="Overview" description="Live numbers from your database." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, note, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">{label}</span>
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Icon className="size-4" />
              </span>
            </div>
            <p className="mt-3 text-[28px] leading-none font-bold tracking-[-0.02em] text-ink tabular-nums">{value}</p>
            <p className="mt-1.5 text-xs text-subtle">{note}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card title="Teacher usage" description="Messages per teacher" className="lg:col-span-3">
          {stats.teacher_usage.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No conversations yet" text="Usage appears here once learners start talking." />
            </div>
          ) : (
            <ul className="space-y-4 p-5">
              {stats.teacher_usage.map((u) => {
                const t = byId[u.teacher_id];
                const color = t?.color ?? "#888888";
                return (
                  <li key={u.teacher_id} className="flex items-center gap-3">
                    <TeacherAvatar name={t?.name ?? u.teacher_id} color={color} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-semibold text-ink">{t?.name ?? u.teacher_id}</span>
                        <span className="text-xs text-muted tabular-nums">
                          {u.messages} messages · {u.conversations} learners
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-hover">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(u.messages / maxMessages) * 100}%`, background: color }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Recent conversations" description="Latest learner activity" className="lg:col-span-2">
          {stats.recent.length === 0 ? (
            <div className="p-5">
              <EmptyState title="Nothing yet" />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {stats.recent.map((item) => {
                const t = byId[item.teacher_id];
                return (
                  <li key={item.id}>
                    <Link
                      href={`/admin/conversations/${item.id}`}
                      className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-hover/50"
                    >
                      <TeacherAvatar name={t?.name ?? "?"} color={t?.color ?? "#888888"} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink">
                          <span className="font-semibold">{item.user_name}</span>
                          <span className="text-muted"> with {t?.name ?? item.teacher_id}</span>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted">{item.last_message}</p>
                        <p className="mt-0.5 text-[11px] text-subtle">{timeAgo(item.updated_at)}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
