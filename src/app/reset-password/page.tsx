"use client";

import { useActionState } from "react";
import { Panda } from "lucide-react";
import { resetPassword, type AuthState } from "@/app/actions/auth";
import PasswordInput from "@/app/components/PasswordInput";

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    resetPassword,
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
            Set new password
          </h1>
          <p className="text-center text-sm text-zinc-400 max-w-[280px]">
            Please enter your new password below.
          </p>
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

          <label className="field">
            <span>New Password</span>
            <PasswordInput
              name="password"
              placeholder="Min. 6 characters"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>

          <label className="field">
            <span>Confirm New Password</span>
            <PasswordInput
              name="confirmPassword"
              placeholder="Confirm password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="primary-button mt-2 w-full disabled:opacity-60"
          >
            {pending ? "Updating password…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
