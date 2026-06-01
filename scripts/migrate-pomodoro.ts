/**
 * Applies the pomodoro schema migration via the Supabase Management API.
 * No direct DB connection needed — uses the service role key.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/migrate-pomodoro.ts
 *
 * Find your service role key:
 *   Supabase Dashboard → Project Settings → API → service_role (secret)
 */
export {};

const PROJECT_REF = "fxdiymycmpgbeqpoeuvh";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error(
    "\n❌  SUPABASE_SERVICE_ROLE_KEY is not set.\n" +
      "   Find it in: Supabase Dashboard → Project Settings → API → service_role key\n" +
      "   Run as: SUPABASE_SERVICE_ROLE_KEY=your-key npx tsx scripts/migrate-pomodoro.ts\n"
  );
  process.exit(1);
}

const SQL = `
-- 1. Add pomodoro_count to todos
alter table todos
  add column if not exists pomodoro_count integer not null default 0;

-- 2. Add total_hours to weekly_goals
alter table weekly_goals
  add column if not exists total_hours integer not null default 0;

-- 3. Create session_type enum (idempotent)
do $$ begin
  create type session_type as enum ('work', 'short_break', 'long_break');
exception when duplicate_object then null;
end $$;

-- 4. Create pomodoro_sessions table
create table if not exists pomodoro_sessions (
  id               text         primary key,
  user_id          uuid         not null references auth.users(id) on delete cascade,
  todo_id          text         not null references todos(id) on delete cascade,
  weekly_goal_id   text,
  type             session_type not null default 'work',
  started_at       bigint       not null,
  ended_at         bigint,
  duration_minutes integer,
  interrupted      boolean      not null default false
);

-- 5. Enable RLS
alter table pomodoro_sessions enable row level security;

-- 6. RLS policy (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'pomodoro_sessions'
    and policyname = 'Users manage own pomodoro sessions'
  ) then
    create policy "Users manage own pomodoro sessions"
      on pomodoro_sessions for all
      using  (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

-- 7. Helper RPC to atomically increment pomodoro_count
create or replace function increment_pomodoro_count(p_todo_id text, p_user_id uuid)
returns void
language sql
security definer
as $$
  update todos
  set pomodoro_count = pomodoro_count + 1
  where id = p_todo_id and user_id = p_user_id;
$$;
`;

async function run() {
  console.log("🚀  Applying pomodoro migration…");

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: SQL }),
    }
  );

  const body = await res.json();

  if (!res.ok) {
    console.error("❌  Migration failed:", JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log("✅  Pomodoro migration applied successfully.");
  console.log("    • todos.pomodoro_count column added");
  console.log("    • weekly_goals.total_hours column added");
  console.log("    • pomodoro_sessions table created with RLS");
  console.log("    • increment_pomodoro_count() RPC created");
}

run();
