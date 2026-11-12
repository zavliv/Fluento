"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  multiline?: boolean;
};

export function ListEditor({ items, onChange, placeholder, addLabel = "Add item", multiline = true }: Props) {
  const update = (index: number, value: string) => onChange(items.map((item, i) => (i === index ? value : item)));
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  const move = (index: number, delta: number) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="group flex items-start gap-2">
          <span className="mt-2.5 w-5 shrink-0 text-right font-mono text-xs text-subtle">{index + 1}</span>
          {multiline ? (
            <textarea
              value={item}
              rows={1}
              onChange={(e) => update(index, e.target.value)}
              placeholder={placeholder}
              className="min-h-10 w-full resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm leading-relaxed text-ink outline-none [field-sizing:content] placeholder:text-subtle focus:border-accent/50"
            />
          ) : (
            <input
              value={item}
              onChange={(e) => update(index, e.target.value)}
              placeholder={placeholder}
              className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none placeholder:text-subtle focus:border-accent/50"
            />
          )}
          <div className="mt-1 flex shrink-0 items-center opacity-60 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            <RowButton label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
              <ArrowUp />
            </RowButton>
            <RowButton label="Move down" disabled={index === items.length - 1} onClick={() => move(index, 1)}>
              <ArrowDown />
            </RowButton>
            <RowButton label="Remove" onClick={() => remove(index)} danger>
              <X />
            </RowButton>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="ml-7 flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted transition-colors hover:bg-hover hover:text-ink"
      >
        <Plus className="size-4" />
        {addLabel}
      </button>
    </div>
  );
}

function RowButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-lg text-subtle transition-colors disabled:opacity-30 [&_svg]:size-3.5",
        danger ? "hover:bg-danger/10 hover:text-danger" : "hover:bg-hover hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
