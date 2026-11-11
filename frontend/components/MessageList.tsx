"use client";

import { ArrowDown } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { Message } from "@/lib/types";
import { AssistantMessage, UserMessage } from "./Message";

type Props = {
  messages: Message[];
  isStreaming: boolean;
  onRegenerate: () => void;
  onEdit: (id: string, text: string) => void;
};

export function MessageList({ messages, isStreaming, onRegenerate, onEdit }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const count = useRef(0);
  const [showJump, setShowJump] = useState(false);

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
      <div ref={ref} onScroll={onScroll} className="h-full overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-7 px-4 pt-6 pb-10 md:px-6">
          {messages.map((m) =>
            m.role === "user" ? (
              <UserMessage key={m.id} message={m} canEdit={!isStreaming} onEdit={onEdit} />
            ) : (
              <AssistantMessage
                key={m.id}
                message={m}
                isLast={m.id === lastAssistantId}
                canRegenerate={!isStreaming}
                onRegenerate={onRegenerate}
              />
            ),
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={jump}
        aria-label="Scroll to latest"
        className={`absolute bottom-3 left-1/2 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-[0_6px_20px_-8px_rgba(0,0,0,0.25)] transition-all hover:text-ink ${
          showJump ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
        }`}
      >
        <ArrowDown className="size-4" />
      </button>
    </div>
  );
}
