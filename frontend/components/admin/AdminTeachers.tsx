"use client";

import { Mars, Pencil, Plus, Search, Venus } from "lucide-react";
import { useMemo, useState } from "react";
import { TEACHERS, type Teacher } from "@/lib/teachers";
import { cn, uid } from "@/lib/utils";
import { TeacherAvatar } from "../TeacherAvatar";
import { Switch } from "../ui/Switch";
import { useToast } from "../ui/Toast";
import { TeacherEditor } from "./TeacherEditor";
import { Badge, Button, PageHeader } from "./ui";

type Filter = "all" | "active" | "hidden";

const blankTeacher = (): Teacher => ({
  id: uid(),
  name: "",
  specialty: "",
  tagline: "",
  personality: "",
  starters: [],
  tags: [],
  goals: [],
  level: "All levels",
  voice: "female",
  color: "#0d9488",
  enabled: true,
});

export function AdminTeachers() {
  const toast = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>(TEACHERS);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<{ teacher: Teacher; isNew: boolean } | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return teachers.filter(
      (t) =>
        (filter === "all" || (filter === "active" ? t.enabled : !t.enabled)) &&
        (!q || `${t.name} ${t.specialty}`.toLowerCase().includes(q)),
    );
  }, [teachers, query, filter]);

  const counts = {
    all: teachers.length,
    active: teachers.filter((t) => t.enabled).length,
    hidden: teachers.filter((t) => !t.enabled).length,
  };

  const save = (teacher: Teacher) => {
    const exists = teachers.some((t) => t.id === teacher.id);
    setTeachers((ts) => (exists ? ts.map((t) => (t.id === teacher.id ? teacher : t)) : [...ts, teacher]));
    setEditing(null);
    toast({ message: exists ? `${teacher.name} updated` : `${teacher.name} added` });
  };

  const remove = (id: string) => {
    const removed = teachers.find((t) => t.id === id);
    setTeachers((ts) => ts.filter((t) => t.id !== id));
    setEditing(null);
    if (removed) {
      toast({
        message: `${removed.name} deleted`,
        action: { label: "Undo", onClick: () => setTeachers((ts) => [...ts, removed]) },
      });
    }
  };

  const toggle = (id: string, enabled: boolean) =>
    setTeachers((ts) => ts.map((t) => (t.id === id ? { ...t, enabled } : t)));

  return (
    <>
      <PageHeader
        title="Teachers"
        description="The teacher personalities learners can choose from."
        actions={
          <Button variant="primary" onClick={() => setEditing({ teacher: blankTeacher(), isNew: true })}>
            <Plus />
            Add teacher
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-0.5 rounded-xl bg-hover p-0.5">
          {(["all", "active", "hidden"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-sm capitalize transition-all",
                filter === f ? "bg-surface font-semibold text-ink shadow-sm" : "text-muted hover:text-ink",
              )}
            >
              {f}
              <span className="text-xs text-subtle tabular-nums">{counts[f]}</span>
            </button>
          ))}
        </div>
        <label className="flex h-9 w-full items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm sm:w-64">
          <Search className="size-4 text-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search teachers"
            className="w-full bg-transparent text-ink outline-none placeholder:text-subtle"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <p className="text-sm font-semibold text-ink">No teachers found</p>
          <p className="mt-1 text-xs text-muted">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((t) => (
            <article
              key={t.id}
              className={cn(
                "group flex flex-col rounded-2xl border border-line bg-surface p-4 transition-all hover:border-accent/30 hover:shadow-[0_10px_24px_-18px_rgb(0_0_0/0.4)]",
                !t.enabled && "opacity-60",
              )}
            >
              <div className="flex items-start gap-3">
                <TeacherAvatar name={t.name} color={t.color} size={44} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[15px] font-semibold text-ink">{t.name}</h3>
                  <p className="truncate text-xs font-medium" style={{ color: t.color }}>
                    {t.specialty}
                  </p>
                </div>
                <Switch checked={t.enabled} onChange={(v) => toggle(t.id, v)} label={`${t.name} available`} />
              </div>

              <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-muted">{t.tagline}</p>

              <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                <div className="flex items-center gap-1.5">
                  <Badge>{t.level}</Badge>
                  <span className="flex items-center gap-1 text-xs text-subtle capitalize">
                    {t.voice === "female" ? <Venus className="size-3.5" /> : <Mars className="size-3.5" />}
                    {t.voice}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing({ teacher: t, isNew: false })}
                  className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted transition-colors hover:bg-hover hover:text-ink"
                >
                  <Pencil className="size-3.5" />
                  Edit
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-subtle">Changes are kept on this page only until the admin API is connected.</p>

      {editing && (
        <TeacherEditor
          key={editing.teacher.id}
          teacher={editing.teacher}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={remove}
        />
      )}
    </>
  );
}
