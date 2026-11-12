import { cn } from "@/lib/utils";

export function TeacherAvatar({
  name,
  color,
  size = 36,
  className,
}: {
  name: string;
  color: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[30%] leading-none font-bold select-none",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.44,
        color: `color-mix(in srgb, ${color} 75%, var(--ink))`,
        background: `color-mix(in srgb, ${color} 16%, transparent)`,
      }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
