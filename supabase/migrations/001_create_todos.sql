-- ── todos table ──────────────────────────────────────────────
-- Timestamps are stored as Unix milliseconds (bigint) to match
-- the TypeScript interface without any date conversion.

create table if not exists todos (
  id           text     primary key,
  user_id      uuid     not null references auth.users(id) on delete cascade,
  title        text     not null,
  description  text,
  created_at   bigint   not null,
  due_date     bigint   not null,
  completed_at bigint,
  completed    boolean  not null default false
);

-- ── Row-Level Security ────────────────────────────────────────
-- Enforces data isolation at the database layer so one user can
-- never read or mutate another user's todos, even if the app
-- code has a bug.

alter table todos enable row level security;

create policy "Users can manage their own todos"
  on todos
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Indexes ───────────────────────────────────────────────────
-- Speed up the common query: fetch all todos for a user ordered
-- by creation time.

create index if not exists todos_user_id_created_at_idx
  on todos (user_id, created_at asc);
