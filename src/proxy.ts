import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login", "/signup", "/forgot-password", "/auth/callback"];

/**
 * Proxy (Next.js 16 equivalent of middleware).
 *
 * Responsibilities:
 * 1. Refresh the Supabase session cookie on every request so it never
 *    silently expires mid-session.
 * 2. Redirect unauthenticated users who try to access protected routes
 *    to /login.
 * 3. Redirect already-authenticated users away from /login and /signup
 *    back to /.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Create a Supabase client that can read/write cookies on the response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write updated cookies onto both the request and the response so
          // downstream Server Components see the refreshed session.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Calling getUser() refreshes the session if the access token has expired.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Unauthenticated user trying to reach a protected route → /login
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated user hitting /login or /signup → home
  if (user && isPublicRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on all routes except Next.js internals and static files.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
