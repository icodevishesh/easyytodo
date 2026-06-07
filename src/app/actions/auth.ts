"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase.server";

export type AuthState = {
  error?: string;
  info?: string;
} | null;

// ── Sign Up ───────────────────────────────────────────────────

export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = (formData.get("name") as string)?.trim();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name) return { error: "Name is required." };
  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });

  if (error) return { error: error.message };

  if (!data.session) {
    return {
      info: "Check your inbox — we sent you a confirmation link. Click it to activate your account, then sign in.",
    };
  }

  redirect("/");
}

// ── Sign In ───────────────────────────────────────────────────

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Supabase returns "Email not confirmed" when the user signed up but
    // hasn't clicked the confirmation link yet.
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        error:
          "Your email isn't confirmed yet. Check your inbox for the confirmation link, then try again.",
      };
    }
    // Generic credential error — don't leak whether the email exists.
    if (
      error.message.toLowerCase().includes("invalid login") ||
      error.message.toLowerCase().includes("invalid credentials")
    ) {
      return { error: "Incorrect email or password." };
    }
    return { error: error.message };
  }

  redirect("/");
}

// ── Sign Out ──────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  // Explicitly delete all Supabase auth cookies so the browser doesn't
  // carry a stale session after the server-side sign-out.
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  for (const cookie of allCookies) {
    if (cookie.name.startsWith("sb-")) {
      cookieStore.delete(cookie.name);
    }
  }

  redirect("/login");
}

// ── Forgot Password ──────────────────────────────────────────

export async function forgotPassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Email is required." };
  }

  // Get the origin dynamically from headers (needed to build redirect link)
  const { headers } = await import("next/headers");
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    info: "Check your inbox — we sent you a password reset link. Click it to reset your password.",
  };
}

// ── Reset Password ───────────────────────────────────────────

export async function resetPassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return { error: "Both password fields are required." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}
