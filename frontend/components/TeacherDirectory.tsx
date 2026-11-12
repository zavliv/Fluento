"use client";

import type { ReactNode } from "react";
import type { Teacher } from "@/lib/teachers";
import { TeacherGrid } from "./TeacherGrid";

type Props = {
  teachers: Teacher[];
  myTeacherIds: string[];
  onSelect: (teacherId: string) => void;
  userName?: string;
  today?: ReactNode;
};

export function TeacherDirectory({ teachers, myTeacherIds, onSelect, userName, today }: Props) {
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
        {today && <div className="mt-6">{today}</div>}
        <TeacherGrid teachers={teachers} myTeacherIds={myTeacherIds} onSelect={onSelect} className="mt-7" />
      </div>
    </div>
  );
}
