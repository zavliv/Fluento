"use client";

import {
  Check,
  CheckCheck,
  Pencil,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useState } from "react";
import type { Teacher } from "@/lib/teachers";
import type { Feedback, Message } from "@/lib/types";
import { cn, messageText } from "@/lib/utils";
import { CopyButton } from "./CopyButton";
import { IconButton } from "./IconButton";
import { Markdown } from "./Markdown";
import { TeacherAvatar } from "./TeacherAvatar";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { ToolCallCard } from "./ToolCallCard";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

type UserProps = {
  message: Message;
  animate: boolean;
  canEdit: boolean;
  onEdit: (id: string, text: string) => void;
};

export function UserMessage({ message, animate, canEdit, onEdit }: UserProps) {
  const text = messageText(message);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  const save = () => {
    if (!draft.trim()) return;
    setEditing(false);
    if (draft.trim() !== text) onEdit(message.id, draft);
  };

  if (editing) {
    return (
      <div className="flex justify-end">
        <div className="w-full max-w-[85%] rounded-2xl border border-accent/40 bg-surface p-3 shadow-[0_8px_24px_-16px_rgb(0_0_0/0.3)]">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                save();
              }
              if (e.key === "Escape") setEditing(false);
            }}
            className="block max-h-72 min-h-16 w-full resize-none bg-transparent text-[15px] leading-7 text-ink outline-none [field-sizing:content]"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs text-subtle">Editing resends from this message</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraft(text);
                  setEditing(false);
                }}
                className="rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-hover hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink hover:opacity-90"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group flex flex-col items-end", animate && "animate-in")}>
      <div className="max-w-[80%] rounded-2xl rounded-br-md border border-line/60 bg-bubble px-4 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap text-ink">
        {text}
      </div>
      <div className="mt-1 flex items-center gap-0.5">
        <div className="flex items-center gap-0.5 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
          <CopyButton text={text} />
          {canEdit && (
            <IconButton
              label="Edit"
              size="sm"
              onClick={() => {
                setDraft(text);
                setEditing(true);
              }}
            >
              <Pencil />
            </IconButton>
          )}
        </div>
        <span className="ml-1 text-xs text-subtle">{formatTime(message.createdAt)}</span>
        {message.receipt && <Receipt read={message.receipt === "read"} />}
      </div>
    </div>
  );
}

function Receipt({ read }: { read: boolean }) {
  const Icon = read ? CheckCheck : Check;
  return (
    <span
      role="img"
      aria-label={read ? "Read" : "Sent"}
      title={read ? "Read" : "Sent, waiting for the teacher"}
      className={cn("ml-1 flex", read ? "text-accent" : "text-subtle")}
    >
      <Icon className="size-3.5" strokeWidth={2.4} />
    </span>
  );
}

type AssistantProps = {
  teacher: Teacher;
  message: Message;
  animate: boolean;
  isLast: boolean;
  canRegenerate: boolean;
  speaking: boolean;
  canSpeak: boolean;
  onRegenerate: () => void;
  onFeedback: (id: string, feedback: Feedback | undefined) => void;
  onReadAloud: (id: string, text: string, voice: Teacher["voice"]) => void;
};

export function AssistantMessage({
  teacher,
  message,
  animate,
  isLast,
  canRegenerate,
  speaking,
  canSpeak,
  onRegenerate,
  onFeedback,
  onReadAloud,
}: AssistantProps) {
  const streaming = message.status === "streaming";
  const text = messageText(message);
  const lastPart = message.parts.at(-1);
  const waitingAfterTool = streaming && lastPart?.type === "tool" && lastPart.status !== "running";

  const toggleFeedback = (value: Feedback) => onFeedback(message.id, message.feedback === value ? undefined : value);

  return (
    <div className={cn("group", animate && "animate-in")}>
      <div className="min-w-0">
        <div className="mb-2 flex h-7 items-center gap-2.5">
          <TeacherAvatar
            name={teacher.name}
            color={teacher.color}
            size={26}
            className={cn(streaming && "logo-pulse")}
          />
          <span className="text-sm font-semibold text-ink">{teacher.name}</span>
          <span className="text-xs text-subtle">{formatTime(message.createdAt)}</span>
        </div>

        {(streaming || message.parts.length > 0) && (
          <div className="teacher-bubble w-fit max-w-full rounded-2xl rounded-tl-md px-4 py-3">
            {streaming && message.parts.length === 0 && <ThinkingIndicator label={`${teacher.name} is typing`} />}

            {message.parts.map((part, i) =>
              part.type === "tool" ? (
                <ToolCallCard key={part.id} part={part} />
              ) : (
                <Markdown key={i} text={part.text} streaming={streaming && i === message.parts.length - 1} />
              ),
            )}

            {waitingAfterTool && <ThinkingIndicator label="Working" />}
          </div>
        )}

        {message.status === "error" && (
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-danger/25 bg-danger/6 px-3.5 py-3 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">Response failed</p>
              <p className="mt-0.5 text-muted">{message.error}</p>
            </div>
            {isLast && canRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="shrink-0 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:bg-hover"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {message.status === "stopped" && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-hover px-2.5 py-0.5 text-xs text-muted">
            Stopped
          </p>
        )}

        {!streaming && text && (
          <div
            className={cn(
              "mt-2 -ml-1.5 flex items-center gap-0.5 transition-opacity",
              !isLast && "md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100",
            )}
          >
            <CopyButton text={text} />
            {canSpeak && (
              <IconButton
                label={speaking ? "Stop reading" : "Read aloud"}
                size="sm"
                onClick={() => onReadAloud(message.id, text, teacher.voice)}
                className={cn(speaking && "bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent")}
              >
                {speaking ? <VolumeX /> : <Volume2 />}
              </IconButton>
            )}
            <IconButton
              label="Good response"
              size="sm"
              onClick={() => toggleFeedback("up")}
              className={cn(message.feedback === "up" && "text-accent hover:text-accent")}
            >
              <ThumbsUp className={cn(message.feedback === "up" && "fill-current")} />
            </IconButton>
            <IconButton
              label="Bad response"
              size="sm"
              onClick={() => toggleFeedback("down")}
              className={cn(message.feedback === "down" && "text-danger hover:text-danger")}
            >
              <ThumbsDown className={cn(message.feedback === "down" && "fill-current")} />
            </IconButton>
            {isLast && canRegenerate && (
              <IconButton label="Regenerate" size="sm" onClick={onRegenerate}>
                <RefreshCw />
              </IconButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
