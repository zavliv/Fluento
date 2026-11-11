"use client";

import { ArrowDown } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { useReadAloud } from "@/hooks/useReadAloud";
import type { Feedback, Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AssistantMessage, UserMessage } from "./Message";

type Props = {
  messages: Message[];
  isStreaming: boolean;
  onRegenerate: () => void;
  onEdit: (id: string, text: string) => void;
  onFeedback: (id: string, feedback: Feedback | undefined) => void;
};

export function MessageList({ messages, isStreaming, onRegenerate, onEdit, onFeedback }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const count = useRef(0);
  const [initialIds] = useState(() => new Set(messages.map((m) => m.id)));
  const [showJump, setShowJump] = useState(false);
  const readAloud = useReadAloud();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (messages.length !== count.current) {
      count.current = messages.length;
      stick.current = true;
    }
    if (stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stick.current = nearBottom;
    setShowJump(!nearBottom);
  };

  const jump = () => {
    const el = ref.current;
    if (!el) return;
    stick.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const lastAssistantId = messages.findLast((m) => m.role === "assistant")?.id;

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={ref} onScroll={onScroll} className="fade-edges h-full overflow-y-auto">
        <div className="fade-in mx-auto flex max-w-4xl flex-col gap-7 px-4 pt-8 pb-12 md:px-6">
          {messages.map((m) =>
            m.role === "user" ? (
              <UserMessage
                key={m.id}
                message={m}
                animate={!initialIds.has(m.id)}
                canEdit={!isStreaming}
                onEdit={onEdit}
              />
            ) : (
              <AssistantMessage
                key={m.id}
                message={m}
                animate={!initialIds.has(m.id)}
                isLast={m.id === lastAssistantId}
                canRegenerate={!isStreaming}
                speaking={readAloud.speakingId === m.id}
                canSpeak={readAloud.supported}
                onRegenerate={onRegenerate}
                onFeedback={onFeedback}
                onReadAloud={readAloud.toggle}
              />
            ),
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={jump}
        aria-label="Scroll to latest"
        className={cn(
          "absolute bottom-3 left-1/2 flex h-9 -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-medium text-muted shadow-[0_6px_20px_-8px_rgb(0_0_0/0.25)] transition-all hover:text-ink",
          showJump ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
        )}
      >
        <ArrowDown className="size-3.5" />
        {isStreaming ? "New reply" : "Latest"}
      </button>
    </div>
  );
}
