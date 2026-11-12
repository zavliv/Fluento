"use client";

import { ArrowRight, Mars, Venus } from "lucide-react";
import { toSpeakableText } from "@/lib/export";
import type { Teacher } from "@/lib/teachers";
import type { Message } from "@/lib/types";
import { greeting, messageText } from "@/lib/utils";
import { TeacherAvatar } from "./TeacherAvatar";

type Props = {
  teachers: Teacher[];
  lastMessage: (teacherId: string) => Message | null;
  onSelect: (teacherId: string) => void;
};

export function TeacherDirectory({ teachers, lastMessage, onSelect }: Props) {
  return (
    <div className="relative min-h-0 flex-1 overflow-y-auto">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden />

      <div className="relative mx-auto w-full max-w-5xl px-4 py-10 md:px-8 md:py-14">
        <div className="animate-in mb-9 text-center">
          <p className="text-sm font-semibold text-accent">{greeting()}</p>
          <h1 className="mt-2 text-[32px] leading-[1.15] font-bold tracking-[-0.02em] text-ink md:text-[40px]">
            Who would you like to learn with?
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
            Pick a teacher and start talking. Type or tap the mic, and they&apos;ll correct your English as you go.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map((teacher, i) => {
            const last = lastMessage(teacher.id);
            const preview = last ? toSpeakableText(messageText(last)) : "";
            return (
              <button
                key={teacher.id}
                type="button"
                onClick={() => onSelect(teacher.id)}
                className="animate-in group flex flex-col rounded-2xl border border-line bg-surface/80 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--teacher)] hover:bg-surface hover:shadow-[0_14px_30px_-20px_rgb(0_0_0/0.45)]"
                style={
                  {
                    animationDelay: `${60 + i * 40}ms`,
                    "--teacher": `color-mix(in srgb, ${teacher.color} 45%, transparent)`,
                  } as React.CSSProperties
                }
              >
                <div className="flex items-center gap-3.5">
                  <TeacherAvatar name={teacher.name} color={teacher.color} size={48} />
                  <div className="min-w-0">
                    <p className="text-[17px] font-bold tracking-tight text-ink">{teacher.name}</p>
                    <p className="truncate text-sm font-medium" style={{ color: teacher.color }}>
                      {teacher.specialty}
                    </p>
                  </div>
                </div>

                <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-muted">
                  {preview ? `“${preview}”` : teacher.tagline}
                </p>

                <div className="mt-5 flex items-center justify-between border-t border-line pt-3.5">
                  <span className="flex items-center gap-2 text-xs text-subtle">
                    <span className="rounded-full border border-line px-2 py-0.5 font-medium text-muted">
                      {teacher.level}
                    </span>
                    <span className="flex items-center gap-1 capitalize">
                      {teacher.voice === "female" ? <Venus className="size-3.5" /> : <Mars className="size-3.5" />}
                      {teacher.voice}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-sm font-semibold text-ink transition-colors group-hover:text-accent">
                    {last ? "Continue" : "Start talking"}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
