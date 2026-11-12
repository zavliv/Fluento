"use client";

import {
  ArrowLeft,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  ScrollText,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { useAuth } from "../auth/AuthProvider";
import { IconButton } from "../IconButton";
import { Wordmark } from "../Wordmark";
import { LoadingState } from "./ui";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/teachers", label: "Teachers", icon: GraduationCap },
  { href: "/admin/rules", label: "Rules", icon: ScrollText },
  { href: "/admin/conversations", label: "Conversations", icon: MessagesSquare },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  useTheme();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, pathname, router]);

  if (loading || !user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg">
        <LoadingState label="Checking your access…" />
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-ink">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <ShieldAlert className="size-6" />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-[-0.01em]">Admins only</h1>
          <p className="mt-1 text-sm text-muted">
            You&apos;re signed in as {user.email}, which isn&apos;t an admin account.
          </p>
        </div>
        <Link href="/" className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-bg">
          Back to Fluento
        </Link>
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
          <Link
            href="/"
            className="mb-2 flex h-9 items-center gap-2.5 rounded-xl px-3 text-sm text-muted transition-colors hover:bg-hover hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            Back to app
          </Link>
          <div className="flex items-center gap-2.5 rounded-xl px-1.5 py-1">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-hover text-sm font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-subtle">{user.email}</p>
            </div>
            <IconButton label="Log out" onClick={() => void logout()}>
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
