import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: "sm" | "md";
};

export function IconButton({ label, size = "md", className, children, ...rest }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg text-muted transition-colors",
        "hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-accent",
        "disabled:pointer-events-none disabled:opacity-40",
        size === "sm" ? "size-7 [&_svg]:size-3.5" : "size-8 [&_svg]:size-4",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
