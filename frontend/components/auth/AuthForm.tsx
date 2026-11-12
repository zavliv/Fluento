"use client";

import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "../SiteSettings";
import { Wordmark } from "../Wordmark";
import { useAuth } from "./AuthProvider";

type Mode = "login" | "signup";

const COPY = {
  login: {
    title: "Welcome back",
    subtitle: "Log in to continue your conversations.",
    submit: "Log in",
    switchText: "New here?",
    switchLink: "Create an account",
  },
  signup: {
    title: "Create your account",
    subtitle: "Free, and it takes less than a minute. Your conversations are saved to your account.",
    submit: "Create account",
    switchText: "Already have an account?",
    switchLink: "Log in",
  },
};

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

export function AuthForm({ mode }: { mode: Mode }) {
  const { user, loading, login, signup } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { app_name, signup_enabled } = useSiteSettings();
  const copy = COPY[mode];
  const closed = mode === "signup" && !signup_enabled;

  const teacher = params.get("teacher");
  const next = safeNext(params.get("next"));
  const carry = new URLSearchParams();
  if (teacher) carry.set("teacher", teacher);
  if (next) carry.set("next", next);
  const switchHref = `/${mode === "login" ? "signup" : "login"}${carry.size ? `?${carry}` : ""}`;

  useEffect(() => {
    if (loading || !user) return;
    router.replace(next ?? (teacher ? `/?teacher=${encodeURIComponent(teacher)}` : "/"));
  }, [user, loading, next, teacher, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") await signup(name, email, password);
      else await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 md:px-8">
        <Link href="/" aria-label={`${app_name} home`}>
          <Wordmark />
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pt-[8vh] pb-16">
        {closed ? (
          <div className="animate-in w-full max-w-[400px]">
            <h1 className="text-[28px] leading-tight font-bold tracking-[-0.025em]">Sign-ups are closed</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              {app_name} isn&apos;t accepting new accounts right now. If you already have one, you can log in.
            </p>
            <Link
              href={`/login${carry.size ? `?${carry}` : ""}`}
              className="mt-8 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink text-[15px] font-semibold text-bg transition-opacity hover:opacity-90"
            >
              Log in
              <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : (
          <div className="animate-in w-full max-w-[400px]">
            <h1 className="text-[28px] leading-tight font-bold tracking-[-0.025em]">{copy.title}</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{copy.subtitle}</p>

            <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
              {mode === "signup" && (
                <AuthField label="Your name">
                  <input
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="What should your teachers call you?"
                    className={inputClass}
                  />
                </AuthField>
              )}
              <AuthField label="Email">
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </AuthField>
              <AuthField label="Password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "Create a password" : "Your password"}
                    className={cn(inputClass, "pr-11")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-subtle hover:bg-hover hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </AuthField>

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
                disabled={submitting}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink text-[15px] font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {copy.submit}
                {!submitting && <ArrowRight className="size-4" />}
              </button>
            </form>

            {(mode === "signup" || signup_enabled) && (
              <p className="mt-6 text-center text-sm text-muted">
                {copy.switchText}{" "}
                <Link href={switchHref} className="font-semibold text-ink underline-offset-4 hover:underline">
                  {copy.switchLink}
                </Link>
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink outline-none transition-colors placeholder:text-subtle focus:border-accent/60";

function AuthField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-subtle">{hint}</span>}
    </label>
  );
}
