-- ── Migration: Pomodoro sessions + schema updates ────────────
-- Run this in the Supabase SQL editor.

-- 1. Add pomodoro_count to todos
alter table todos
  add column if not exists pomodoro_count integer not null default 0;

-- 2. Add total_hours to weekly_goals
alter table weekly_goals
  add column if not exists total_hours integer not null default 0;

-- 3. Create session_type enum
do $$ begin
  create type session_type as enum ('work', 'short_break', 'long_break');
exception when duplicate_object then null;
end $$;

-- 4. Create pomodoro_sessions table
create table if not exists pomodoro_sessions (
  id               text        primary key,
  user_id          uuid        not null references auth.users(id) on delete cascade,
  todo_id          text        not null references todos(id) on delete cascade,
  weekly_goal_id   text,
  type             session_type not null default 'work',
  started_at       bigint      not null,
  ended_at         bigint,
  duration_minutes integer,
  interrupted      boolean     not null default false
);

alter table pomodoro_sessions enable row level security;

create policy "Users manage own pomodoro sessions"
  on pomodoro_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Helper RPC to increment pomodoro_count atomically
create or replace function increment_pomodoro_count(p_todo_id text, p_user_id uuid)
returns void
language sql
security definer
as $$
  update todos
  set pomodoro_count = pomodoro_count + 1
  where id = p_todo_id and user_id = p_user_id;
$$;
