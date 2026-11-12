import { ArrowRight, Check } from "lucide-react";
import type { CSSProperties } from "react";
import type { Teacher } from "@/lib/teachers";
import { cn } from "@/lib/utils";
import { TeacherAvatar } from "./TeacherAvatar";

type Props = {
  teacher: Teacher;
  added?: boolean;
  onSelect: (teacherId: string) => void;
  style?: CSSProperties;
  className?: string;
  compact?: boolean;
};

export function TeacherCard({ teacher, added, onSelect, style, className, compact }: Props) {
  if (compact)
    return <CompactCard teacher={teacher} added={added} onSelect={onSelect} style={style} className={className} />;
  return (
    <button
      type="button"
      onClick={() => onSelect(teacher.id)}
      className={cn(
        "group flex gap-4 rounded-2xl border border-line bg-surface p-5 text-left sm:gap-5 sm:p-6 transition-all duration-200",
        "hover:border-[var(--t-border)] hover:shadow-[0_14px_34px_-26px_rgb(0_0_0/0.5)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
      style={
        {
          ...style,
          "--t-color": teacher.color,
          "--t-border": `color-mix(in srgb, ${teacher.color} 45%, var(--line))`,
          "--t-fill": `color-mix(in srgb, ${teacher.color} 14%, transparent)`,
        } as CSSProperties
      }
    >
      <TeacherAvatar name={teacher.name} color={teacher.color} size={56} className="mt-0.5" />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[18px] leading-tight font-bold tracking-[-0.015em] text-ink">{teacher.name}</h3>
            <p className="mt-1 text-sm font-semibold" style={{ color: teacher.color }}>
              {teacher.specialty}
            </p>
          </div>
          {added ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-hover px-2.5 py-1 text-xs font-medium text-muted">
              <Check className="size-3.5" />
              Added
            </span>
          ) : (
            <span className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted">
              {teacher.level}
            </span>
          )}
        </div>

        <p className="mt-3 text-[15px] leading-relaxed text-muted">{teacher.tagline}</p>

        <blockquote
          className="mt-4 border-l-2 pl-3.5 text-sm leading-relaxed text-ink italic"
          style={{ borderColor: teacher.color }}
        >
          {teacher.quote}
        </blockquote>

        <span className="min-h-5 flex-1" aria-hidden />

        <div className="flex items-center justify-end gap-4 border-t border-line pt-4 sm:justify-between">
          <p className="hidden min-w-0 text-[13px] leading-snug text-subtle sm:block">{teacher.tags.join(" · ")}</p>
          <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-ink transition-colors group-hover:text-[var(--t-color)]">
            {added ? "Continue" : `Talk to ${teacher.name}`}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </button>
  );
}

function CompactCard({ teacher, added, onSelect, style, className }: Omit<Props, "compact">) {
  return (
    <button
      type="button"
      onClick={() => onSelect(teacher.id)}
      className={cn(
        "group flex flex-col rounded-2xl border border-line bg-surface p-4 text-left transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-[var(--t-border)] hover:shadow-[0_14px_34px_-26px_rgb(0_0_0/0.5)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
      style={
        {
          ...style,
          "--t-color": teacher.color,
          "--t-border": `color-mix(in srgb, ${teacher.color} 45%, var(--line))`,
        } as CSSProperties
      }
    >
      <div className="flex items-center gap-3">
        <TeacherAvatar name={teacher.name} color={teacher.color} size={44} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[16px] leading-tight font-bold tracking-[-0.01em] text-ink">{teacher.name}</h3>
          <p className="mt-0.5 truncate text-[13px] font-semibold" style={{ color: teacher.color }}>
            {teacher.specialty}
          </p>
        </div>
        {added ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-hover px-2 py-0.5 text-[11px] font-medium text-muted">
            <Check className="size-3" />
            Added
          </span>
        ) : (
          <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-muted">
            {teacher.level}
          </span>
        )}
      </div>
      <p className="mt-3 line-clamp-2 min-h-[2.75em] text-sm leading-relaxed text-muted">{teacher.tagline}</p>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        <p className="min-w-0 truncate text-xs text-subtle">{teacher.tags.join(" · ")}</p>
        <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-ink transition-colors group-hover:text-[var(--t-color)]">
          {added ? "Open" : "Talk"}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}
