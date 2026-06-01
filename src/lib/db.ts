/**
 * Data layer — Supabase `todos` and `weekly_goals` tables.
 *
 * ── SQL (run in Supabase SQL editor) ──────────────────────────
 *
 * -- 1. Add weekly_goal_id to todos (if table already exists)
 * alter table todos add column if not exists weekly_goal_id text;
 *
 * -- 2. Create weekly_goals table
 * create type goal_status as enum ('active', 'in_progress', 'achieved');
 *
 * create table if not exists weekly_goals (
 *   id                    text        primary key,
 *   user_id               uuid        not null references auth.users(id) on delete cascade,
 *   title                 text        not null,
 *   description           text,
 *   start_date            bigint      not null,
 *   end_date              bigint      not null,
 *   status                goal_status not null default 'active',
 *   completion_percentage integer     not null default 0,
 *   review                text,
 *   created_at            bigint      not null,
 *   updated_at            bigint      not null
 * );
 *
 * alter table weekly_goals enable row level security;
 * create policy "Users manage own goals"
 *   on weekly_goals for all
 *   using (auth.uid() = user_id)
 *   with check (auth.uid() = user_id);
 *
 * ─────────────────────────────────────────────────────────────
 */

import { createClient } from "./supabase";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// ── Todo types ────────────────────────────────────────────────

export interface Todo {
  id: string;
  weeklyGoalId?: string;
  title: string;
  description?: string;
  createdAt: number;
  dueDate: number;
  completedAt?: number;
  completed: boolean;
  pomodoroCount?: number;
}

interface TodoRow {
  id: string;
  user_id: string;
  weekly_goal_id: string | null;
  title: string;
  description: string | null;
  created_at: number;
  due_date: number;
  completed_at: number | null;
  completed: boolean;
  pomodoro_count: number;
}

function todoFromRow(row: TodoRow): Todo {
  return {
    id: row.id,
    weeklyGoalId: row.weekly_goal_id ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    createdAt: row.created_at,
    dueDate: row.due_date,
    completedAt: row.completed_at ?? undefined,
    completed: row.completed,
    pomodoroCount: row.pomodoro_count ?? 0,
  };
}

// ── Pomodoro session types ────────────────────────────────────

export type SessionType = "work" | "short_break" | "long_break";

export interface PomodoroSession {
  id: string;
  userId: string;
  todoId: string;
  weeklyGoalId?: string;
  type: SessionType;
  startedAt: number;
  endedAt?: number;
  durationMinutes?: number;
  interrupted: boolean;
}

interface PomodoroSessionRow {
  id: string;
  user_id: string;
  todo_id: string;
  weekly_goal_id: string | null;
  type: SessionType;
  started_at: number;
  ended_at: number | null;
  duration_minutes: number | null;
  interrupted: boolean;
}

function sessionFromRow(row: PomodoroSessionRow): PomodoroSession {
  return {
    id: row.id,
    userId: row.user_id,
    todoId: row.todo_id,
    weeklyGoalId: row.weekly_goal_id ?? undefined,
    type: row.type,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    durationMinutes: row.duration_minutes ?? undefined,
    interrupted: row.interrupted,
  };
}

// ── Weekly goal types ─────────────────────────────────────────

export type GoalStatus = "active" | "in_progress" | "achieved";

export interface WeeklyGoal {
  id: string;
  title: string;
  description?: string;
  startDate: number;
  endDate: number;
  totalHours: number;
  status: GoalStatus;
  completionPercentage: number;
  review?: string;
  createdAt: number;
  updatedAt: number;
}

interface GoalRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_date: number;
  end_date: number;
  total_hours: number;
  status: GoalStatus;
  completion_percentage: number;
  review: string | null;
  created_at: number;
  updated_at: number;
}

function goalFromRow(row: GoalRow): WeeklyGoal {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date,
    totalHours: row.total_hours ?? 0,
    status: row.status,
    completionPercentage: row.completion_percentage,
    review: row.review ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Todo CRUD ─────────────────────────────────────────────────

/** Todos created within the last 7 days (shown on the main Tasks view). */
export async function getRecentTodos(userId: string): Promise<Todo[]> {
  const supabase = createClient();
  const since = Date.now() - SEVEN_DAYS_MS;
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as TodoRow[]).map(todoFromRow);
}

/** Todos older than 7 days (shown on the History page). */
export async function getHistoryTodos(userId: string): Promise<Todo[]> {
  const supabase = createClient();
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("user_id", userId)
    .lt("created_at", cutoff)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as TodoRow[]).map(todoFromRow);
}

/** All todos for a user (used for goal completion calculation). */
export async function getAllTodos(userId: string): Promise<Todo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as TodoRow[]).map(todoFromRow);
}

export async function addTodo(userId: string, todo: Todo): Promise<void> {
  const supabase = createClient();
  const row: TodoRow = {
    id: todo.id,
    user_id: userId,
    weekly_goal_id: todo.weeklyGoalId ?? null,
    title: todo.title,
    description: todo.description ?? null,
    created_at: todo.createdAt,
    due_date: todo.dueDate,
    completed_at: todo.completedAt ?? null,
    completed: todo.completed,
    pomodoro_count: todo.pomodoroCount ?? 0,
  };
  const { error } = await supabase.from("todos").insert(row);
  if (error) throw new Error(error.message);
}

export async function updateTodo(
  userId: string,
  id: string,
  patch: Partial<Omit<Todo, "id">>
): Promise<void> {
  const supabase = createClient();
  const rowPatch: Partial<Omit<TodoRow, "id" | "user_id">> = {};
  if (patch.weeklyGoalId !== undefined)
    rowPatch.weekly_goal_id = patch.weeklyGoalId ?? null;
  if (patch.title !== undefined) rowPatch.title = patch.title;
  if (patch.description !== undefined)
    rowPatch.description = patch.description ?? null;
  if (patch.createdAt !== undefined) rowPatch.created_at = patch.createdAt;
  if (patch.dueDate !== undefined) rowPatch.due_date = patch.dueDate;
  if (patch.completedAt !== undefined)
    rowPatch.completed_at = patch.completedAt ?? null;
  if (patch.completed !== undefined) rowPatch.completed = patch.completed;

  const { error } = await supabase
    .from("todos")
    .update(rowPatch)
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function deleteTodo(userId: string, id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("todos")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

// ── Weekly goal CRUD ──────────────────────────────────────────

export async function getWeeklyGoals(userId: string): Promise<WeeklyGoal[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("weekly_goals")
    .select("*")
    .eq("user_id", userId)
    .order("start_date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as GoalRow[]).map(goalFromRow);
}

export async function addWeeklyGoal(
  userId: string,
  goal: WeeklyGoal
): Promise<void> {
  const supabase = createClient();
  const row: GoalRow = {
    id: goal.id,
    user_id: userId,
    title: goal.title,
    description: goal.description ?? null,
    start_date: goal.startDate,
    end_date: goal.endDate,
    total_hours: goal.totalHours ?? 0,
    status: goal.status,
    completion_percentage: goal.completionPercentage,
    review: goal.review ?? null,
    created_at: goal.createdAt,
    updated_at: goal.updatedAt,
  };
  const { error } = await supabase.from("weekly_goals").insert(row);
  if (error) throw new Error(error.message);
}

export async function updateWeeklyGoal(
  userId: string,
  id: string,
  patch: Partial<Omit<WeeklyGoal, "id" | "createdAt">>
): Promise<void> {
  const supabase = createClient();
  const rowPatch: Partial<Omit<GoalRow, "id" | "user_id">> = {
    updated_at: Date.now(),
  };
  if (patch.title !== undefined) rowPatch.title = patch.title;
  if (patch.description !== undefined)
    rowPatch.description = patch.description ?? null;
  if (patch.startDate !== undefined) rowPatch.start_date = patch.startDate;
  if (patch.endDate !== undefined) rowPatch.end_date = patch.endDate;
  if (patch.totalHours !== undefined) rowPatch.total_hours = patch.totalHours;
  if (patch.status !== undefined) rowPatch.status = patch.status;
  if (patch.completionPercentage !== undefined)
    rowPatch.completion_percentage = patch.completionPercentage;
  if (patch.review !== undefined) rowPatch.review = patch.review ?? null;

  const { error } = await supabase
    .from("weekly_goals")
    .update(rowPatch)
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function deleteWeeklyGoal(
  userId: string,
  id: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("weekly_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/**
 * Recalculates completion_percentage for a goal based on its linked todos.
 * completed / total * 100, rounded to nearest integer.
 */
export async function recalcGoalCompletion(
  userId: string,
  goalId: string
): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("todos")
    .select("completed")
    .eq("user_id", userId)
    .eq("weekly_goal_id", goalId);

  if (error) throw new Error(error.message);
  const todos = data as { completed: boolean }[];
  if (todos.length === 0) {
    await updateWeeklyGoal(userId, goalId, { completionPercentage: 0 });
    return;
  }
  const done = todos.filter((t) => t.completed).length;
  const pct = Math.round((done / todos.length) * 100);
  await updateWeeklyGoal(userId, goalId, { completionPercentage: pct });
}

// ── Pomodoro session CRUD ─────────────────────────────────────

export async function startPomodoroSession(
  userId: string,
  todoId: string,
  weeklyGoalId?: string
): Promise<PomodoroSession> {
  const supabase = createClient();
  const session: PomodoroSessionRow = {
    id: crypto.randomUUID(),
    user_id: userId,
    todo_id: todoId,
    weekly_goal_id: weeklyGoalId ?? null,
    type: "work",
    started_at: Date.now(),
    ended_at: null,
    duration_minutes: null,
    interrupted: false,
  };
  const { error } = await supabase.from("pomodoro_sessions").insert(session);
  if (error) throw new Error(error.message);
  return sessionFromRow(session);
}

export async function endPomodoroSession(
  userId: string,
  sessionId: string,
  interrupted: boolean
): Promise<void> {
  const supabase = createClient();
  const endedAt = Date.now();

  // Fetch the session to compute duration
  const { data: rows, error: fetchErr } = await supabase
    .from("pomodoro_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();
  if (fetchErr) throw new Error(fetchErr.message);

  const row = rows as PomodoroSessionRow;
  const durationMinutes = Math.round((endedAt - row.started_at) / 60_000);

  const { error } = await supabase
    .from("pomodoro_sessions")
    .update({ ended_at: endedAt, duration_minutes: durationMinutes, interrupted })
    .eq("id", sessionId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  // Increment pomodoro_count on the todo (only for completed, non-interrupted sessions)
  if (!interrupted) {
    const { error: todoErr } = await supabase.rpc("increment_pomodoro_count", {
      p_todo_id: row.todo_id,
      p_user_id: userId,
    });
    // Gracefully ignore if RPC doesn't exist — count update is best-effort
    if (todoErr) console.warn("increment_pomodoro_count RPC not available:", todoErr.message);
  }
}

export async function getPomodoroSessionsForGoal(
  userId: string,
  goalId: string
): Promise<PomodoroSession[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pomodoro_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("weekly_goal_id", goalId)
    .eq("type", "work")
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as PomodoroSessionRow[]).map(sessionFromRow);
}

/** Returns total worked minutes for a goal (completed work sessions only). */
export async function getGoalWorkedMinutes(
  userId: string,
  goalId: string
): Promise<number> {
  const sessions = await getPomodoroSessionsForGoal(userId, goalId);
  return sessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
}

/** Returns all pomodoro sessions for a user (recent, for the Pomodoro view). */
export async function getRecentPomodoroSessions(
  userId: string
): Promise<PomodoroSession[]> {
  const supabase = createClient();
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const { data, error } = await supabase
    .from("pomodoro_sessions")
    .select("*")
    .eq("user_id", userId)
    .gte("started_at", since)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as PomodoroSessionRow[]).map(sessionFromRow);
}
