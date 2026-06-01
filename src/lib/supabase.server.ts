import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client.
 *
 * Reads and writes the auth session via Next.js cookies so the session is
 * available in Server Components, Server Actions, Route Handlers, and the
 * proxy.
 *
 * Cookie writes work in Server Actions and Route Handlers. In Server
 * Components the cookie store is read-only — writes are silently ignored
 * there, which is fine because the proxy handles session refresh on every
 * request.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // In a Server Component this throws because the cookie store is
          // read-only. We catch only that specific case and ignore it — the
          // proxy will refresh the session on the next request.
          // In Server Actions and Route Handlers this always succeeds, which
          // is critical for sign-out (cookie deletion) to work correctly.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (err) {
            // Only suppress the "cookies were called outside a request scope"
            // / read-only error that Next.js throws from Server Components.
            // Re-throw anything unexpected so bugs aren't hidden.
            if (
              !(err instanceof Error) ||
              !err.message.includes("cookies")
            ) {
              throw err;
            }
          }
        },
      },
    }
  );
}
