import { Check, LoaderCircle, X } from "lucide-react";

export function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

type Props = {
  transcribing: boolean;
  elapsed: number;
  levels: number[];
  onCancel: () => void;
  onFinish: () => void;
};

export function VoiceRecorderBar({ transcribing, elapsed, levels, onCancel, onFinish }: Props) {
  if (transcribing) {
    return (
      <div className="flex h-[88px] items-center justify-center gap-2.5 text-sm" role="status" aria-live="polite">
        <LoaderCircle className="size-4 animate-spin text-accent" />
        <span className="shimmer-text font-medium">Transcribing your voice…</span>
      </div>
    );
  }

  return (
    <div className="flex h-[88px] items-center gap-3 px-3" role="status" aria-live="polite">
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel recording"
        title="Cancel (Esc)"
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-hover hover:text-ink"
      >
        <X className="size-[18px]" />
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <span className="relative flex size-2.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-danger opacity-50" />
          <span className="relative size-2.5 rounded-full bg-danger" />
        </span>
        <span className="w-10 font-mono text-sm text-ink tabular-nums">{formatDuration(elapsed)}</span>
      </div>

      <div className="flex h-10 min-w-0 flex-1 items-center justify-center gap-[3px] overflow-hidden" aria-hidden>
        {levels.map((level, i) => (
          <span
            key={i}
            className="w-[3px] shrink-0 rounded-full bg-accent transition-[height] duration-75"
            style={{ height: `${Math.max(8, level * 100)}%`, opacity: 0.35 + level * 0.65 }}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onFinish}
        aria-label="Stop and transcribe"
        title="Stop and transcribe (Enter)"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition-transform hover:scale-105 active:scale-95"
      >
        <Check className="size-[18px]" strokeWidth={2.4} />
      </button>
    </div>
  );
}
