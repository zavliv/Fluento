export function ThinkingIndicator({ label = "Thinking" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 text-sm" role="status" aria-live="polite">
      <span className="dots" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      <span className="shimmer-text font-medium">{label}</span>
    </div>
  );
}
