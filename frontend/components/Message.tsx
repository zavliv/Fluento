"use client";

import { Pencil, RefreshCw, TriangleAlert } from "lucide-react";
import { useState } from "react";
import type { Message } from "@/lib/types";
import { cn, messageText } from "@/lib/utils";
import { CopyButton } from "./CopyButton";
import { IconButton } from "./IconButton";
import { LogoMark } from "./Logo";
import { Markdown } from "./Markdown";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { ToolCallCard } from "./ToolCallCard";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

type UserProps = {
  message: Message;
  canEdit: boolean;
  onEdit: (id: string, text: string) => void;
};

export function UserMessage({ message, canEdit, onEdit }: UserProps) {
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
      <div className="animate-in flex justify-end">
        <div className="w-full max-w-[85%] rounded-2xl border border-accent/40 bg-surface p-3">
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
          <div className="mt-2 flex justify-end gap-2">
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
    );
  }

  return (
    <div className="animate-in group flex flex-col items-end">
      <div className="max-w-[85%] rounded-[20px] rounded-br-md bg-bubble px-4 py-2.5 text-[15px] leading-7 break-words whitespace-pre-wrap text-ink">
        {text}
      </div>
      <div className="mt-1 flex items-center gap-0.5 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
        <span className="mr-1 text-xs text-subtle">{formatTime(message.createdAt)}</span>
        <CopyButton text={text} />
        {canEdit && (
          <IconButton
            label="Edit message"
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
    </div>
  );
}

type AssistantProps = {
  message: Message;
  isLast: boolean;
  canRegenerate: boolean;
  onRegenerate: () => void;
};

export function AssistantMessage({ message, isLast, canRegenerate, onRegenerate }: AssistantProps) {
  const streaming = message.status === "streaming";
  const text = messageText(message);
  const lastPart = message.parts.at(-1);
  const waitingAfterTool = streaming && lastPart?.type === "tool" && lastPart.status !== "running";

  return (
    <div className="animate-in group flex gap-3.5">
      <LogoMark size={28} className="mt-0.5" />
      <div className="min-w-0 flex-1 pt-0.5">
        {streaming && message.parts.length === 0 && <ThinkingIndicator />}

        {message.parts.map((part, i) =>
          part.type === "tool" ? (
            <ToolCallCard key={part.id} part={part} />
          ) : (
            <Markdown key={i} text={part.text} streaming={streaming && i === message.parts.length - 1} />
          ),
        )}

        {waitingAfterTool && <ThinkingIndicator label="Working" />}

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

        {!streaming && (
          <div
            className={cn(
              "mt-2 -ml-1.5 flex items-center gap-0.5 transition-opacity",
              !isLast && "md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100",
            )}
          >
            {text && <CopyButton text={text} />}
            {isLast && canRegenerate && (
              <IconButton label="Regenerate" size="sm" onClick={onRegenerate}>
                <RefreshCw />
              </IconButton>
            )}
            <span className="ml-1 text-xs text-subtle">{formatTime(message.createdAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
