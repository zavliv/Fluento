"use client";

import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { GOALS, pickGuide, type Teacher, type TeacherGoal } from "@/lib/teachers";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "./SiteSettings";
import { TeacherAvatar } from "./TeacherAvatar";
import { TeacherCard } from "./TeacherCard";

type Props = {
  teachers: Teacher[];
  myTeacherIds?: string[];
  onSelect: (teacherId: string) => void;
  className?: string;
};

type Filter = "all" | TeacherGoal;

export function TeacherGrid({ teachers, myTeacherIds = [], onSelect, className }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = useMemo(
    () => (filter === "all" ? teachers : teachers.filter((t) => t.goals.includes(filter))),
    [teachers, filter],
  );
  const { default_teacher_id } = useSiteSettings();
  const guide = pickGuide(teachers, default_teacher_id);

  return (
    <div className={className}>
      <div className="-mx-4 overflow-x-auto px-4 pb-1">
        <div
          role="tablist"
          aria-label="Filter teachers by goal"
          className="inline-flex gap-1 rounded-xl border border-line bg-surface p-1"
        >
          {[{ id: "all" as const, label: "All" }, ...GOALS].map((goal) => (
            <button
              key={goal.id}
              type="button"
              role="tab"
              aria-selected={filter === goal.id}
              onClick={() => setFilter(goal.id)}
              className={cn(
                "h-8 shrink-0 rounded-lg px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
                filter === goal.id ? "bg-ink text-bg" : "text-muted hover:bg-hover hover:text-ink",
              )}
            >
              {goal.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {visible.map((teacher, i) => (
          <TeacherCard
            key={teacher.id}
            teacher={teacher}
            added={myTeacherIds.includes(teacher.id)}
            onSelect={onSelect}
            className="animate-in"
            style={{ animationDelay: `${i * 35}ms` }}
          />
        ))}

        {filter === "all" && guide && (
          <div
            className="animate-in flex flex-col justify-between gap-6 rounded-2xl border border-dashed border-line p-6"
            style={{ animationDelay: `${visible.length * 35}ms` }}
          >
            <div>
              <h3 className="text-[18px] font-bold tracking-[-0.015em] text-ink">Not sure where to start?</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                Start with {guide.name}. {guide.tagline} You can add more teachers any time.
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl bg-hover p-3 pl-4">
              <div className="flex min-w-0 items-center gap-3">
                <TeacherAvatar name={guide.name} color={guide.color} size={36} />
                <div className="min-w-0 leading-tight">
                  <p className="text-sm font-semibold text-ink">{guide.name}</p>
                  <p className="truncate text-[13px] text-muted">{guide.specialty}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelect(guide.id)}
                className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
              >
                Start with {guide.name}
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {visible.length === 0 && <p className="mt-10 text-center text-sm text-muted">No teachers for this goal yet.</p>}
    </div>
  );
}
