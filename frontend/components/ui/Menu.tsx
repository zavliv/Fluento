"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type MenuItem = {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  danger?: boolean;
};

type Props = {
  items: MenuItem[];
  trigger: (props: { open: boolean; toggle: () => void; ref: (el: HTMLElement | null) => void }) => ReactNode;
};

const WIDTH = 196;

export function Menu({ items, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => {
    if (!open && anchor) {
      const rect = anchor.getBoundingClientRect();
      const left = Math.min(Math.max(8, rect.right - WIDTH), window.innerWidth - WIDTH - 8);
      const menuHeight = items.length * 36 + 12;
      const below = rect.bottom + 6;
      const top = below + menuHeight > window.innerHeight ? rect.top - menuHeight - 6 : below;
      setPosition({ top, left });
    }
    setOpen((o) => !o);
  }, [open, anchor, items.length]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !anchor?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onScroll);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open, anchor]);

  return (
    <>
      {trigger({ open, toggle, ref: setAnchor })}
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="pop-in fixed z-[60] rounded-xl border border-line bg-surface p-1.5 shadow-[0_16px_40px_-16px_rgb(0_0_0/0.35)]"
            style={{ top: position.top, left: position.left, width: WIDTH }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm transition-colors [&_svg]:size-4",
                  item.danger ? "text-danger hover:bg-danger/10" : "text-ink hover:bg-hover",
                )}
              >
                <span className={cn(!item.danger && "text-muted")}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
