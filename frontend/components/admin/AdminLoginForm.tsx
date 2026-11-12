"use client";

import { Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useTheme } from "@/hooks/useTheme";
import { Wordmark } from "../Wordmark";
import { useAdminAuth } from "./AdminAuthProvider";

function safeNext(value: string | null) {
  return value && value.startsWith("/admin") && !value.startsWith("/admin/login") ? value : "/admin";
}

export function AdminLoginForm() {
  const { admin, loading, login } = useAdminAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useTheme();

  useEffect(() => {
    if (!loading && admin) router.replace(next);
  }, [admin, loading, next, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-12 text-ink">
      <div className="animate-in w-full max-w-[380px]">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <Wordmark />
          <span className="rounded-md border border-line px-1.5 py-[3px] text-[10.5px] leading-none font-semibold text-muted">
            Admin
          </span>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
          <div className="mb-6 flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-hover text-ink">
              <LockKeyhole className="size-[18px]" />
            </span>
            <div>
              <h1 className="text-lg leading-tight font-bold tracking-[-0.01em]">Team sign in</h1>
              <p className="mt-1 text-sm text-muted">For Fluento team members only.</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4" noValidate>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold">Work email</span>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@fluento.app"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-subtle hover:bg-hover hover:text-ink"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-danger/25 bg-danger/6 px-3.5 py-2.5 text-sm text-danger"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-ink text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting && <LoaderCircle className="size-4 animate-spin" />}
              Sign in
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs leading-relaxed text-subtle">
          Accounts are created by an owner from the Team page. Ask them if you need access.
        </p>
      </div>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-subtle focus:border-accent/50";
