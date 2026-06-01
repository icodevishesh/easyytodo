# Authentication & Session Management

This document explains how easyytodo handles user identity, session lifecycle, and route protection.

---

## Stack

| Concern | Tool |
|---|---|
| Auth provider | Supabase Auth (email + password) |
| Session storage | HttpOnly cookies managed by `@supabase/ssr` |
| Route protection | Next.js 16 `proxy.ts` (server-side, runs before every request) |
| Server-side session reads | `createServerClient` from `@supabase/ssr` |
| Client-side session reads | `createBrowserClient` from `@supabase/ssr` |

---

## How sessions work

Supabase Auth issues two JWTs on sign-in:

- **Access token** — short-lived (1 hour by default). Sent with every Supabase API call to prove identity.
- **Refresh token** — long-lived. Used to silently obtain a new access token when the current one expires.

`@supabase/ssr` stores both tokens in **HttpOnly cookies** (not `localStorage`). HttpOnly means JavaScript running in the browser cannot read them, which prevents XSS-based token theft.

### Cookie names

Supabase SSR writes cookies with the prefix `sb-<project-ref>-auth-token`. The exact names are managed by the library and are not something the app code needs to reference directly.

---

## File structure

```
src/
├── proxy.ts                      # Route protection + session refresh
├── lib/
│   ├── supabase.ts               # Browser client (Client Components)
│   └── supabase.server.ts        # Server client (Server Components, Actions)
└── app/
    ├── page.tsx                  # Protected home page (Server Component)
    ├── app-client.tsx            # Client boundary — passes user to App
    ├── login/page.tsx            # Public sign-in page
    ├── signup/page.tsx           # Public sign-up page
    └── actions/
        └── auth.ts               # Server Actions: signIn, signUp, signOut
```

---

## Proxy (`src/proxy.ts`)

The proxy runs on **every request** before any page or API route is rendered. It has two jobs:

### 1. Session refresh

```ts
const { data: { user } } = await supabase.auth.getUser();
```

Calling `getUser()` triggers the Supabase SSR client to check whether the access token has expired. If it has, the client automatically uses the refresh token to obtain a new access token and writes the updated cookies onto the response. This means sessions are silently extended as long as the user keeps using the app — they never get logged out mid-session due to token expiry.

### 2. Route gating

```
Unauthenticated user → any route except /login or /signup  →  redirect to /login
Authenticated user   → /login or /signup                   →  redirect to /
```

The proxy reads the session from the **request cookies** (not the database), making this check fast and edge-compatible. It is an optimistic check — the definitive auth check happens in the Server Component and Server Actions.

---

## Two Supabase clients

### Browser client — `src/lib/supabase.ts`

```ts
createBrowserClient(url, key)
```

Used inside Client Components (files with `"use client"`). Reads cookies via the browser's cookie API. Used for all Supabase data queries that run in the browser (the `getTodos`, `addTodo`, etc. functions in `db.ts`).

### Server client — `src/lib/supabase.server.ts`

```ts
createServerClient(url, key, { cookies: { getAll, setAll } })
```

Used in Server Components, Server Actions, and the proxy. Reads cookies from the Next.js `cookies()` API (which reads the incoming request headers). Writes updated cookies back to the response via `setAll`. This is what enables the session refresh in the proxy.

The two clients share the same cookie store — the browser client reads what the server client writes, and vice versa.

---

## Sign-up flow

```
User fills /signup form
  → form action calls signUp() Server Action
    → supabase.auth.signUp({ email, password })
      → Supabase creates user in auth.users
      → Supabase sets auth cookies on the response
    → redirect("/")
  → proxy sees authenticated user, allows through
  → src/app/page.tsx reads user from cookie, renders app
```

Supabase's default configuration requires email confirmation. If you want users to be immediately signed in after sign-up (no email step), disable "Confirm email" in the Supabase dashboard under Authentication → Providers → Email.

---

## Sign-in flow

```
User fills /login form
  → form action calls signIn() Server Action
    → supabase.auth.signInWithPassword({ email, password })
      → Supabase validates credentials
      → Supabase sets auth cookies on the response
    → redirect("/")
  → proxy sees authenticated user, allows through
```

If credentials are wrong, Supabase returns an error. The Server Action returns `{ error: message }` which `useActionState` surfaces in the form UI without a page reload.

---

## Sign-out flow

```
User clicks "Sign out"
  → form action calls signOut() Server Action
    → supabase.auth.signOut()
      → Supabase clears auth cookies
    → redirect("/login")
  → proxy sees unauthenticated user on /login, allows through
```

Sign-out is a Server Action invoked via a `<form action={signOut}>` element. Using a form (not a button with `onClick`) means it works even if JavaScript is disabled.

---

## Data isolation

Every database query in `src/lib/db.ts` is scoped to the authenticated user:

```ts
// Read
supabase.from("todos").select("*").eq("user_id", userId)

// Write
supabase.from("todos").update(patch).eq("id", id).eq("user_id", userId)

// Delete
supabase.from("todos").delete().eq("id", id).eq("user_id", userId)
```

The `userId` comes from the Supabase session and is passed down from the Server Component (`src/app/page.tsx`) through the client boundary (`app-client.tsx`) to the `App` component. It is never derived from user input.

### Row-Level Security (recommended)

The app-layer `user_id` filter is a good first line of defence, but it relies on the application code being correct. For defence in depth, enable Supabase Row-Level Security (RLS) on the `todos` table:

```sql
alter table todos enable row level security;

create policy "Users can manage their own todos"
  on todos for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

With RLS enabled, even if a bug in the app code omitted the `user_id` filter, Postgres would still reject the query.

---

## Database schema

```sql
create table todos (
  id           text     primary key,
  user_id      uuid     not null references auth.users(id) on delete cascade,
  title        text     not null,
  description  text,
  created_at   bigint   not null,
  due_date     bigint   not null,
  completed_at bigint,
  completed    boolean  not null default false
);
```

`user_id` references `auth.users(id)` with `on delete cascade` — if a user account is deleted, all their todos are automatically removed.

Timestamps are stored as Unix milliseconds (`bigint`) to keep the TypeScript interface simple (no `Date` objects or timezone conversions in the data layer).

---

## Environment variables

| Variable | Where used | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + Server | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser + Server | Supabase anon/publishable key |

Both variables are prefixed with `NEXT_PUBLIC_` so they are available in the browser bundle. The anon key is safe to expose — it only grants access to data that RLS policies allow.

The database password (in `.env`) is **not** used by the app at runtime. It is only needed for running migrations with Drizzle or `psql` directly.

---

## Security properties

| Property | How it is achieved |
|---|---|
| Tokens not accessible to JS | HttpOnly cookies |
| Tokens not sent to other origins | `SameSite=Lax` cookies |
| Session silently refreshed | Proxy calls `getUser()` on every request |
| Unauthenticated access blocked | Proxy redirects before page renders |
| Cross-user data access blocked | `user_id` filter on every query + RLS |
| Sign-out works without JS | `<form action={signOut}>` Server Action |
| Secrets not in client bundle | DB password is server-only, never `NEXT_PUBLIC_` |
