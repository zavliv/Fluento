import { cn } from "@/lib/utils";

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[30%] bg-accent-soft leading-none font-bold tracking-tight text-accent select-none",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      O
    </span>
  );
}
