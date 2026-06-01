/**
 * Creates the todos table, enables RLS, and adds the policy.
 * Requires SUPABASE_SERVICE_ROLE_KEY in your .env file.
 *
 * Usage:
 *   npx tsx scripts/setup-db.ts
 */
export {};

const PROJECT_REF = "fxdiymycmpgbeqpoeuvh";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error(
    "\n❌  SUPABASE_SERVICE_ROLE_KEY is not set in your .env file.\n" +
      "   Find it in: Supabase Dashboard → Project Settings → API → service_role key\n" +
      "   Add it to .env as: SUPABASE_SERVICE_ROLE_KEY=your-key-here\n"
  );
  process.exit(1);
}

const SQL = `
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

alter table todos enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'todos'
    and policyname = 'Users can manage their own todos'
  ) then
    create policy "Users can manage their own todos"
      on todos for all
      using  (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

create index if not exists todos_user_id_created_at_idx
  on todos (user_id, created_at asc);
`;

async function run() {
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
    console.error("❌  Failed:", JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log("✅  todos table created (or already exists), RLS enabled.");
}

run();
