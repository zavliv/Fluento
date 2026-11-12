"use client";

import { ArrowLeft, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useLoad } from "@/hooks/useLoad";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Markdown } from "../Markdown";
import { TeacherAvatar } from "../TeacherAvatar";
import { useToast } from "../ui/Toast";
import { Button, ErrorState, formatDate, LoadingState } from "./ui";

export function ConversationView({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const toast = useToast();
  const load = useCallback(
    () => Promise.all([api.admin.conversation(conversationId), api.admin.teachers()]),
    [conversationId],
  );
  const { data, loading, error, reload } = useLoad(load);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (loading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const [conversation, teachers] = data;
  const teacher = teachers.find((t) => t.id === conversation.teacher_id);
  const name = teacher?.name ?? conversation.teacher_id;
  const color = teacher?.color ?? "#64748b";

  const remove = async () => {
    try {
      await api.admin.deleteConversation(conversation.id);
      toast({ message: "Conversation deleted" });
      router.replace("/admin/conversations");
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : "Couldn't delete" });
    }
  };

  return (
    <>
      <Link
        href="/admin/conversations"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        All conversations
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TeacherAvatar name={name} color={color} size={44} />
          <div>
            <h1 className="text-xl font-bold tracking-[-0.01em] text-ink">
              {conversation.user_name} with {name}
            </h1>
            <p className="text-sm text-muted">
              {conversation.user_email} · {conversation.message_count} messages · started{" "}
              {formatDate(conversation.created_at)}
            </p>
          </div>
        </div>
        {confirmDelete ? (
          <div className="flex gap-2">
            <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => void remove()} className="border border-danger/40">
              Delete for good
            </Button>
          </div>
        ) : (
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 />
            Delete
          </Button>
        )}
      </div>

      <div className="max-w-3xl space-y-4 rounded-2xl border border-line bg-surface p-5">
        {conversation.messages.map((m) => {
          const mine = m.role === "user";
          return (
            <div key={m.id} className={cn("flex gap-3", mine && "flex-row-reverse")}>
              {mine ? (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-hover text-xs font-semibold text-ink">
                  {conversation.user_name.charAt(0).toUpperCase()}
                </span>
              ) : (
                <TeacherAvatar name={name} color={color} size={28} />
              )}
              <div className={cn("min-w-0 max-w-[85%]", mine && "text-right")}>
                <div
                  className={cn(
                    "inline-block rounded-2xl px-4 py-2.5 text-left text-[14.5px] leading-relaxed",
                    mine ? "bg-hover text-ink" : "border border-line text-ink",
                  )}
                >
                  {mine ? <p className="whitespace-pre-wrap">{m.content}</p> : <Markdown text={m.content} />}
                </div>
                <p
                  className="mt-1 flex items-center gap-1.5 text-[11px] text-subtle"
                  style={{ justifyContent: mine ? "flex-end" : "flex-start" }}
                >
                  {new Date(m.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  {m.feedback === "up" && <ThumbsUp className="size-3 text-accent" />}
                  {m.feedback === "down" && <ThumbsDown className="size-3 text-danger" />}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
