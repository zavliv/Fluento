import { cn } from "@/lib/utils";

export type Presence = "online" | "offline";

type Props = {
  name: string;
  color: string;
  size?: number;
  presence?: Presence | null;
  ring?: string;
  className?: string;
};

export function TeacherAvatar({ name, color, size = 36, presence, ring = "var(--bg)", className }: Props) {
  const dot = Math.max(8, Math.round(size * 0.26));
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <span
        aria-hidden
        className="inline-flex size-full items-center justify-center rounded-[30%] leading-none font-bold select-none"
        style={{
          fontSize: size * 0.44,
          color: `color-mix(in srgb, ${color} 75%, var(--ink))`,
          background: `color-mix(in srgb, ${color} 16%, transparent)`,
        }}
      >
        {name.trim().charAt(0).toUpperCase() || "?"}
      </span>
      {presence && (
        <span
          role="img"
          aria-label={presence === "online" ? "Online" : "Offline"}
          className={cn("absolute rounded-full", presence === "online" ? "bg-success" : "bg-subtle")}
          style={{ width: dot, height: dot, right: -dot / 4, bottom: -dot / 4, boxShadow: `0 0 0 2px ${ring}` }}
        />
      )}
    </span>
  );
}
