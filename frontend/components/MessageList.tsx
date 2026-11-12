"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { useReadAloud } from "@/hooks/useReadAloud";
import type { Teacher } from "@/lib/teachers";
import type { Feedback, Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AssistantMessage, UserMessage } from "./Message";
import { PresenceStatus } from "./PresenceStatus";
import { TeacherAvatar } from "./TeacherAvatar";

type Props = {
  teacher: Teacher;
  online: boolean | null;
  onSend: (text: string) => void;
  messages: Message[];
  isStreaming: boolean;
  onRegenerate: () => void;
  onEdit: (id: string, text: string) => void;
  onFeedback: (id: string, feedback: Feedback | undefined) => void;
};

export function MessageList({
  teacher,
  online,
  onSend,
  messages,
  isStreaming,
  onRegenerate,
  onEdit,
  onFeedback,
}: Props) {
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
          <TeacherIntro teacher={teacher} online={online} empty={messages.length === 0} onSend={onSend} />
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
                teacher={teacher}
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

type IntroProps = {
  teacher: Teacher;
  online: boolean | null;
  empty: boolean;
  onSend: (text: string) => void;
};

function TeacherIntro({ teacher, online, empty, onSend }: IntroProps) {
  return (
    <div className="relative flex flex-col items-center border-b border-line pt-4 pb-8 text-center">
      <div className="teacher-glow pointer-events-none absolute inset-x-0 -top-8 h-56" aria-hidden />
      <TeacherAvatar
        name={teacher.name}
        color={teacher.color}
        size={72}
        className="relative"
        presence={online === null ? null : online ? "online" : "offline"}
      />
      <h2 className="relative mt-4 text-2xl font-bold tracking-[-0.02em] text-ink">{teacher.name}</h2>
      <p className="relative mt-1 text-sm font-semibold text-accent">
        {teacher.specialty} · {teacher.level}
      </p>
      {online !== null && (
        <p className="relative mt-2.5 text-xs font-medium">
          <PresenceStatus online={online} />
          <span className="text-subtle">{online ? " · Ready to chat" : " · Check that the backend is running"}</span>
        </p>
      )}
      <p className="relative mt-3 max-w-md text-sm leading-relaxed text-muted">{teacher.personality}</p>

      {empty && (
        <div className="relative mt-7 w-full max-w-xl">
          <p className="mb-3 text-xs font-medium tracking-wider text-subtle uppercase">Start with</p>
          <div className="flex flex-col gap-2">
            {teacher.starters.map((starter, i) => (
              <button
                key={starter}
                type="button"
                onClick={() => onSend(starter)}
                className="animate-in group flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left text-sm text-ink transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[0_10px_24px_-18px_rgb(0_0_0/0.45)]"
                style={{ animationDelay: `${80 + i * 50}ms` }}
              >
                <span>{starter}</span>
                <ArrowUp className="size-4 shrink-0 text-subtle transition-colors group-hover:text-accent" />
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-subtle">Or say hello in your own words, by typing or with the mic.</p>
        </div>
      )}
    </div>
  );
}
