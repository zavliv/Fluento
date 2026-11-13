"use client";

import { ArrowUpRight, Check, LoaderCircle, Mic, PhoneOff, Square } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { AssistantResult } from "@/hooks/useTeacherChats";
import { useVoiceLoop, type VoicePhase } from "@/hooks/useVoiceLoop";
import type { Teacher } from "@/lib/teachers";
import { cn } from "@/lib/utils";
import { TeacherAvatar } from "../TeacherAvatar";

const TEACHER_KEY = "fluento:voice-teacher";

type Turn = { id: number; role: "you" | "teacher"; text: string };

type Props = {
  teachers: Teacher[];
  defaultTeacherId: string;
  userName: string;
  onAsk: (teacherId: string, text: string, onText?: (delta: string) => void) => Promise<AssistantResult>;
  onOpenChat: (teacherId: string) => void;
};

function readTeacher() {
  try {
    return localStorage.getItem(TEACHER_KEY);
  } catch {
    return null;
  }
}

export function VoicePage({ teachers, defaultTeacherId, userName, onAsk, onOpenChat }: Props) {
  const [teacherId, setTeacherId] = useState(defaultTeacherId);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const teacher = teachers.find((t) => t.id === teacherId) ?? teachers.find((t) => t.id === defaultTeacherId);

  useEffect(() => {
    const saved = readTeacher();
    if (saved && teachers.some((t) => t.id === saved)) queueMicrotask(() => setTeacherId(saved));
  }, [teachers]);

  const respond = useCallback(
    async (text: string, say: (delta: string) => void) => {
      if (!teacher) return false;
      setNotice(null);
      const replyId = Date.now() + 1;
      setTurns((t) => [...t, { id: Date.now(), role: "you" as const, text }].slice(-12));
      let live = "";
      const result = await onAsk(teacher.id, text, (delta) => {
        live += delta;
        say(delta);
        setTurns((t) => {
          const rest = t.filter((turn) => turn.id !== replyId);
          return [...rest, { id: replyId, role: "teacher" as const, text: live }].slice(-12);
        });
      });
      if (result.queued) {
        setNotice(`${teacher.name} is offline right now. Your message is saved and they'll reply in your chat.`);
        return false;
      }
      if (result.error || !result.text) {
        setNotice(result.error ?? "No reply came back. Try again.");
        return false;
      }
      return true;
    },
    [teacher, onAsk],
  );

  const voice = useVoiceLoop(respond);
  const active = voice.phase !== "idle";

  const begin = () => {
    if (!teacher) return;
    if (turns.length > 0) return void voice.start();
    const first = userName.split(" ")[0];
    const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)](first, teacher.name);
    setTurns([{ id: Date.now(), role: "teacher", text: greeting }]);
    void voice.start(greeting);
  };

  const choose = (id: string) => {
    voice.end();
    setTeacherId(id);
    setTurns([]);
    setNotice(null);
    try {
      localStorage.setItem(TEACHER_KEY, id);
    } catch {}
  };

  if (!teacher) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted">No teachers are available.</div>
    );
  }

  const offline = !teacher.online;
  const recent = turns.slice(-4);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 py-5 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <label className="flex min-w-0 items-center gap-2.5 rounded-xl border border-line bg-surface py-1.5 pr-2 pl-1.5">
            <TeacherAvatar name={teacher.name} color={teacher.color} size={30} />
            <span className="sr-only">Teacher</span>
            <select
              value={teacher.id}
              onChange={(e) => choose(e.target.value)}
              className="min-w-0 cursor-pointer bg-transparent pr-1 text-sm font-semibold text-ink outline-none"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.specialty}
                  {t.online ? "" : " (offline)"}
                </option>
              ))}
            </select>
          </label>
          {turns.length > 0 && (
            <button
              type="button"
              onClick={() => onOpenChat(teacher.id)}
              className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-muted hover:text-ink"
            >
              Open chat
              <ArrowUpRight className="size-4" />
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
          <Orb teacher={teacher} phase={voice.phase} level={voice.level} />
          <p className="mt-5 text-[17px] font-semibold text-ink">{STATUS[voice.phase](teacher.name)}</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {offline
              ? `${teacher.name} is offline. Pick another teacher to talk now.`
              : HINT[voice.phase](teacher.name)}
          </p>
          {(voice.error || notice) && (
            <p role="alert" className="mt-4 max-w-sm rounded-xl bg-danger/8 px-3 py-2 text-sm text-danger">
              {voice.error ?? notice}
            </p>
          )}
        </div>

        {recent.length > 0 && (
          <ol className="mb-5 space-y-2.5 rounded-2xl border border-line bg-surface p-4" aria-label="Transcript">
            {recent.map((turn) => (
              <li key={turn.id} className="text-sm leading-relaxed">
                <span className={cn("mr-2 text-xs font-semibold", turn.role === "you" ? "text-muted" : "")}>
                  {turn.role === "you" ? "You" : <span style={{ color: teacher.color }}>{teacher.name}</span>}
                </span>
                <span className={turn.role === "you" ? "text-muted" : "text-ink"}>{turn.text}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="flex items-center justify-center gap-4 pb-2">
          {active && (
            <button
              type="button"
              onClick={voice.end}
              aria-label="End conversation"
              title="End"
              className="flex size-12 items-center justify-center rounded-full border border-line bg-surface text-danger transition-colors hover:bg-danger/8"
            >
              <PhoneOff className="size-5" />
            </button>
          )}
          <MainButton
            phase={voice.phase}
            disabled={offline}
            onStart={begin}
            onDone={voice.doneTalking}
            onInterrupt={voice.interrupt}
          />
        </div>
      </div>
    </div>
  );
}

const GREETINGS = [
  (name: string, teacher: string) => `Hi ${name}! It's ${teacher}. How's your day going so far?`,
  (name: string) => `Hey ${name}, good to hear from you! What have you been up to today?`,
  (name: string) => `Hello ${name}! So, what would you like to chat about today?`,
  (name: string) => `Hi ${name}! Tell me, what's something good that happened this week?`,
];

const STATUS: Record<VoicePhase, (name: string) => string> = {
  idle: () => "Tap to start talking",
  listening: () => "Listening…",
  transcribing: () => "Got it…",
  thinking: (name) => `${name} is thinking…`,
  speaking: (name) => `${name} is speaking`,
};

const HINT: Record<VoicePhase, (name: string) => string> = {
  idle: (name) => `Speak naturally with ${name}. It's hands-free: when you pause, ${name} answers out loud.`,
  listening: () => "Speak in English. When you pause, your teacher answers.",
  transcribing: () => "Turning your words into text.",
  thinking: () => "Preparing a reply.",
  speaking: () => "Just start talking to jump in, or tap the square.",
};

function Orb({ teacher, phase, level }: { teacher: Teacher; phase: VoicePhase; level: number }) {
  const listening = phase === "listening";
  const scale = listening ? 1 + Math.min(level, 1) * 0.35 : 1;
  return (
    <div className="relative flex size-48 items-center justify-center" aria-hidden>
      <span
        className="absolute inset-6 rounded-full transition-transform duration-100"
        style={{ background: `color-mix(in srgb, ${teacher.color} 14%, transparent)`, transform: `scale(${scale})` }}
      />
      <span
        className={cn("absolute inset-12 rounded-full", phase === "speaking" && "animate-ping")}
        style={{
          background: `color-mix(in srgb, ${teacher.color} 22%, transparent)`,
          animationDuration: "1.6s",
        }}
      />
      <span
        className="relative flex size-28 items-center justify-center rounded-full text-[40px] font-bold text-white shadow-lg"
        style={{ background: teacher.color }}
      >
        {phase === "thinking" || phase === "transcribing" ? (
          <LoaderCircle className="size-10 animate-spin" />
        ) : (
          teacher.name.charAt(0)
        )}
      </span>
    </div>
  );
}

function MainButton({
  phase,
  disabled,
  onStart,
  onDone,
  onInterrupt,
}: {
  phase: VoicePhase;
  disabled: boolean;
  onStart: () => void;
  onDone: () => void;
  onInterrupt: () => void;
}) {
  const base =
    "flex size-16 items-center justify-center rounded-full transition-[transform,opacity] active:scale-95 disabled:opacity-50";
  if (phase === "listening") {
    return (
      <button
        type="button"
        onClick={onDone}
        aria-label="I'm done talking"
        className={cn(base, "bg-accent text-accent-ink")}
      >
        <Check className="size-7" strokeWidth={3} />
      </button>
    );
  }
  if (phase === "speaking") {
    return (
      <button type="button" onClick={onInterrupt} aria-label="Interrupt" className={cn(base, "bg-ink text-bg")}>
        <Square className="size-6 fill-current" />
      </button>
    );
  }
  if (phase === "thinking" || phase === "transcribing") {
    return (
      <button type="button" disabled aria-label="Please wait" className={cn(base, "bg-hover text-muted")}>
        <LoaderCircle className="size-6 animate-spin" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onStart}
      disabled={disabled}
      aria-label="Start talking"
      className={cn(base, "bg-accent text-accent-ink hover:opacity-90")}
    >
      <Mic className="size-7" />
    </button>
  );
}
