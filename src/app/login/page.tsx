"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Panda } from "lucide-react";
import { signIn, type AuthState } from "@/app/actions/auth";
import PasswordInput from "@/app/components/PasswordInput";

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signIn,
    null
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <Panda className="text-app-accent" size={36} />
          <p className="text-lg font-bold tracking-[0.18em] text-app-accent">
            easyytodo
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--app-text)]">
            Welcome back
          </h1>
        </div>

        {/* Form */}
        <form
          action={action}
          className="rounded-lg border border-app-line bg-app-panel p-6"
        >
          {state?.error && (
            <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {state.error}
            </div>
          )}
          {state?.info && (
            <div className="mb-4 rounded-md border border-app-accent/40 bg-app-accent/10 px-3 py-2 text-sm text-app-accent">
              {state.info}
            </div>
          )}

          <label className="field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <PasswordInput
              name="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="primary-button mt-2 w-full disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-app-accent hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
