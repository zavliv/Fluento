"use client";

import { ArrowLeft, GraduationCap, LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { ToastProvider } from "../ui/Toast";
import { Wordmark } from "../Wordmark";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/teachers", label: "Teachers", icon: GraduationCap },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useTheme();

  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  return (
    <ToastProvider>
      <div className="flex h-dvh flex-col overflow-hidden bg-bg text-ink md:flex-row">
        <aside className="flex shrink-0 flex-col border-line bg-sidebar md:w-[248px] md:border-r">
          <div className="flex h-14 items-center gap-2.5 border-b border-line/70 px-4">
            <Wordmark />
            <span className="rounded-md border border-line px-1.5 py-[3px] text-[10.5px] leading-none font-semibold text-muted">
              Admin
            </span>
          </div>

          <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col md:p-3">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex h-10 shrink-0 items-center gap-2.5 rounded-xl px-3 text-sm transition-colors",
                  isActive(href)
                    ? "bg-surface font-semibold text-ink shadow-[0_1px_2px_rgb(0_0_0/0.05)]"
                    : "text-muted hover:bg-hover hover:text-ink",
                )}
              >
                <Icon className={cn("size-4", isActive(href) && "text-accent")} />
                {label}
              </Link>
            ))}
            <Link
              href="/"
              className="flex h-10 shrink-0 items-center gap-2.5 rounded-xl px-3 text-sm text-muted transition-colors hover:bg-hover hover:text-ink md:hidden"
            >
              <ArrowLeft className="size-4" />
              Chat
            </Link>
          </nav>

          <div className="mt-auto hidden border-t border-line p-3 md:block">
            <Link
              href="/"
              className="flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm text-muted transition-colors hover:bg-hover hover:text-ink"
            >
              <ArrowLeft className="size-4" />
              Back to chat
            </Link>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
