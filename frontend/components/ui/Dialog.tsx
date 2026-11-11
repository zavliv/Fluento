"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  className?: string;
};

export function Dialog({ open, onClose, label, children, className }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-start justify-center px-4 pt-[12vh]">
      <div className="fade-in absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          "pop-in relative w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_60px_-20px_rgb(0_0_0/0.5)]",
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
