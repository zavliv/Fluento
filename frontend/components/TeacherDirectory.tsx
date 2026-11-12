"use client";

import { ArrowRight, ClipboardCheck } from "lucide-react";
import { LEVEL_NAMES, type CefrLevel } from "@/lib/api";
import type { Teacher } from "@/lib/teachers";
import { TeacherGrid } from "./TeacherGrid";

type Props = {
  teachers: Teacher[];
  myTeacherIds: string[];
  onSelect: (teacherId: string) => void;
  userName?: string;
  level?: CefrLevel | null;
  onOpenLevelTest?: () => void;
};

export function TeacherDirectory({ teachers, myTeacherIds, onSelect, userName, level, onOpenLevelTest }: Props) {
  const firstTime = myTeacherIds.length === 0;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
        <header className="animate-in max-w-2xl">
          <h1 className="text-[28px] leading-tight font-bold tracking-[-0.025em] text-ink md:text-[34px]">
            {firstTime ? `Welcome${userName ? `, ${userName.split(" ")[0]}` : ""}` : "All teachers"}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            {firstTime
              ? "Pick your first teacher to start practising. They'll stay in your sidebar so you can come back any time."
              : "Add another teacher to practise a different skill. Everyone you pick stays in your sidebar."}
          </p>
        </header>
        {onOpenLevelTest && (
          <button
            type="button"
            onClick={onOpenLevelTest}
            className="animate-in mt-6 flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-accent/40"
          >
            <span
              className={`flex size-11 shrink-0 items-center justify-center rounded-xl font-bold ${level ? "bg-accent text-accent-ink" : "bg-accent-soft text-accent"}`}
            >
              {level ?? <ClipboardCheck className="size-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">
                {level ? `Your level: ${level} · ${LEVEL_NAMES[level]}` : "Not sure of your level?"}
              </span>
              <span className="block text-sm text-muted">
                {level
                  ? "Your teachers adapt to this level. Retake the test any time to track your progress."
                  : "Take a 5-minute level test and get matched with the right teacher."}
              </span>
            </span>
            <span className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-ink sm:inline-flex">
              {level ? "Open" : "Take the test"}
              <ArrowRight className="size-4" />
            </span>
          </button>
        )}
        <TeacherGrid teachers={teachers} myTeacherIds={myTeacherIds} onSelect={onSelect} className="mt-7" />
      </div>
    </div>
  );
}
