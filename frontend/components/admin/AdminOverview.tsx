import { MessageSquare, MessagesSquare, ThumbsUp, GraduationCap } from "lucide-react";
import { TEACHERS } from "@/lib/teachers";
import { TeacherAvatar } from "../TeacherAvatar";
import { Badge, Card, PageHeader } from "./ui";

const USAGE: Record<string, number> = { maya: 34, arjun: 21, emma: 16, riya: 11, leo: 8, sophia: 6, james: 4 };

const ACTIVITY = [
  { teacher: "maya", text: "New conversation started", time: "2 min ago" },
  { teacher: "arjun", text: "Mock interview completed · score 7/10", time: "18 min ago" },
  { teacher: "emma", text: "12 grammar corrections given", time: "1 h ago" },
  { teacher: "riya", text: "Lesson explained in Hinglish", time: "3 h ago" },
  { teacher: "sophia", text: "IELTS speaking practice · band 6.5", time: "Yesterday" },
];

export function AdminOverview() {
  const active = TEACHERS.filter((t) => t.enabled).length;
  const stats = [
    { label: "Teachers", value: `${active}/${TEACHERS.length}`, note: "active", icon: GraduationCap },
    { label: "Conversations", value: "128", note: "this week", icon: MessagesSquare },
    { label: "Messages", value: "2,431", note: "this week", icon: MessageSquare },
    { label: "Helpful replies", value: "92%", note: "thumbs up", icon: ThumbsUp },
  ];
  const byId = Object.fromEntries(TEACHERS.map((t) => [t.id, t]));

  return (
    <>
      <PageHeader
        title="Overview"
        description="How learners are using Orbit AI."
        actions={<Badge>Sample data</Badge>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, note, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">{label}</span>
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Icon className="size-4" />
              </span>
            </div>
            <p className="mt-3 text-[28px] leading-none font-bold tracking-[-0.02em] text-ink">{value}</p>
            <p className="mt-1.5 text-xs text-subtle">{note}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card title="Teacher usage" description="Share of conversations per teacher" className="lg:col-span-3">
          <ul className="space-y-4 p-5">
            {[...TEACHERS]
              .sort((a, b) => (USAGE[b.id] ?? 0) - (USAGE[a.id] ?? 0))
              .map((t) => (
                <li key={t.id} className="flex items-center gap-3">
                  <TeacherAvatar name={t.name} color={t.color} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-semibold text-ink">{t.name}</span>
                      <span className="text-xs text-muted tabular-nums">{USAGE[t.id] ?? 0}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-hover">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${USAGE[t.id] ?? 0}%`, background: t.color }}
                      />
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </Card>

        <Card title="Recent activity" description="Latest learner sessions" className="lg:col-span-2">
          <ul className="divide-y divide-line">
            {ACTIVITY.map((item, i) => {
              const t = byId[item.teacher];
              return (
                <li key={i} className="flex items-start gap-3 px-5 py-3.5">
                  <TeacherAvatar name={t.name} color={t.color} size={28} />
                  <div className="min-w-0">
                    <p className="text-sm text-ink">
                      <span className="font-semibold">{t.name}</span> · {item.text}
                    </p>
                    <p className="mt-0.5 text-xs text-subtle">{item.time}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}
