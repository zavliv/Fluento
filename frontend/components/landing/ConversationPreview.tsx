import { ArrowUp, Mic } from "lucide-react";
import type { Teacher } from "@/lib/teachers";
import { TeacherAvatar } from "../TeacherAvatar";

export function ConversationPreview({ teacher }: { teacher: Teacher }) {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_60px_-36px_rgb(0_0_0/0.45)]"
    >
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <TeacherAvatar
          name={teacher.name}
          color={teacher.color}
          size={32}
          presence={teacher.online ? "online" : "offline"}
          ring="var(--surface)"
        />
        <div className="leading-tight">
          <p className="text-sm font-semibold text-ink">{teacher.name}</p>
          <p className="text-xs">
            <span className={teacher.online ? "font-medium text-success" : "font-medium text-subtle"}>
              {teacher.online ? "Online" : "Offline"}
            </span>
            <span className="text-subtle"> · {teacher.specialty}</span>
          </p>
        </div>
      </div>

      <div className="space-y-4 bg-bg/40 px-4 py-5">
        <div className="flex justify-end">
          <p className="max-w-[80%] rounded-2xl rounded-br-md border border-line/60 bg-bubble px-3.5 py-2 text-[13.5px] leading-relaxed text-ink">
            Yesterday I go to the market and buyed some apples.
          </p>
        </div>

        <div className="max-w-[88%]">
          <div className="mb-1.5 flex items-center gap-2">
            <TeacherAvatar name={teacher.name} color={teacher.color} size={20} />
            <span className="text-xs font-semibold text-ink">{teacher.name}</span>
          </div>
          <div
            className="rounded-2xl rounded-tl-md border px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink"
            style={{
              background: `color-mix(in srgb, ${teacher.color} 6%, var(--surface))`,
              borderColor: `color-mix(in srgb, ${teacher.color} 18%, var(--line))`,
            }}
          >
            <p>That sounds lovely! What did you make with them?</p>
            <p className="mt-2">
              <span className="font-semibold" style={{ color: teacher.color }}>
                Small tip:
              </span>{" "}
              Yesterday I <strong style={{ color: teacher.color }}>went</strong> to the market and{" "}
              <strong style={{ color: teacher.color }}>bought</strong> some apples.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <p className="max-w-[80%] rounded-2xl rounded-br-md border border-line/60 bg-bubble px-3.5 py-2 text-[13.5px] leading-relaxed text-ink">
            I went to the market and I bought apples. I made a pie!
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-line px-3 py-2.5">
        <span className="flex-1 px-1 text-[13px] text-subtle">Message {teacher.name}…</span>
        <span
          className="flex size-8 items-center justify-center rounded-full"
          style={{ background: `color-mix(in srgb, ${teacher.color} 14%, transparent)`, color: teacher.color }}
        >
          <Mic className="size-4" />
        </span>
        <span className="flex size-8 items-center justify-center rounded-full bg-hover text-subtle">
          <ArrowUp className="size-4" />
        </span>
      </div>
    </div>
  );
}
