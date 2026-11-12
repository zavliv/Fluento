import { cn } from "@/lib/utils";

type Props = {
  online: boolean | null;
  typing?: boolean;
  className?: string;
};

export function PresenceStatus({ online, typing, className }: Props) {
  if (typing) return <span className={cn("shimmer-text font-medium", className)}>typing…</span>;
  if (online === null) return null;
  return (
    <span className={cn("font-medium", online ? "text-success" : "text-subtle", className)}>
      {online ? "Online" : "Offline"}
    </span>
  );
}
