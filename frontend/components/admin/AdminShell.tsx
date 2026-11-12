"use client";

import {
  Zap,
  ClipboardCheck,
  ExternalLink,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  ScrollText,
  ShieldCheck,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { IconButton } from "../IconButton";
import { Wordmark } from "../Wordmark";
import { useAdminAuth } from "./AdminAuthProvider";
import { LoadingState } from "./ui";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/teachers", label: "Teachers", icon: GraduationCap },
  { href: "/admin/rules", label: "Rules", icon: ScrollText },
  { href: "/admin/level-test", label: "Level test", icon: ClipboardCheck },
  { href: "/admin/practice", label: "Practice", icon: Zap },
  { href: "/admin/guardrails", label: "Guardrails", icon: ShieldCheck },
  { href: "/admin/conversations", label: "Conversations", icon: MessagesSquare },
  { href: "/admin/users", label: "Learners", icon: Users },
  { href: "/admin/team", label: "Team", icon: UserCog },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const { admin, loading, logout } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  useTheme();

  useEffect(() => {
    if (!loading && !admin) router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, admin, pathname, router]);

  if (loading || !admin) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg">
        <LoadingState label="Checking your access…" />
      </div>
    );
  }

  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  return (
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
        </nav>

        <div className="mt-auto hidden border-t border-line p-3 md:block">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="mb-2 flex h-9 items-center gap-2.5 rounded-xl px-3 text-sm text-muted transition-colors hover:bg-hover hover:text-ink"
          >
            <ExternalLink className="size-4" />
            Open learner site
          </a>
          <div className="flex items-center gap-1 rounded-xl">
            <Link
              href="/admin/account"
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1.5 py-1 transition-colors hover:bg-hover",
                pathname === "/admin/account" && "bg-hover",
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-bg">
                {admin.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-sm font-semibold">{admin.name}</span>
                <span className="block truncate text-xs text-subtle capitalize">{admin.role}</span>
              </span>
            </Link>
            <IconButton label="Sign out" onClick={() => void logout()}>
              <LogOut />
            </IconButton>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">{children}</div>
      </main>
    </div>
  );
}
