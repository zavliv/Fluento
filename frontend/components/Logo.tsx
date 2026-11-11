import { cn } from "@/lib/utils";

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[30%] bg-accent text-accent-ink",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none" aria-hidden>
        <circle cx="12" cy="12" r="3.1" fill="currentColor" />
        <path d="M4.6 13.6A7.6 7.6 0 0 1 17.4 6.6" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
        <path d="M19.4 10.4A7.6 7.6 0 0 1 6.6 17.4" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
        <circle cx="18.6" cy="5.4" r="1.7" fill="currentColor" />
        <circle cx="5.4" cy="18.6" r="1.7" fill="currentColor" />
      </svg>
    </span>
  );
}
