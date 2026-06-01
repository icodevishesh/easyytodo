import {
  pgTable,
  text,
  uuid,
  bigint,
  boolean,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

// ── Enums ─────────────────────────────────────────────────────
export const goalStatusEnum = pgEnum("goal_status", [
  "active",
  "in_progress",
  "achieved",
]);

export const sessionTypeEnum = pgEnum("session_type", [
  "work",
  "short_break",
  "long_break",
]);

// ── todos ─────────────────────────────────────────────────────
export const todos = pgTable("todos", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  weeklyGoalId: text("weekly_goal_id"), // nullable FK → weekly_goals.id
  title: text("title").notNull(),
  description: text("description"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  dueDate: bigint("due_date", { mode: "number" }).notNull(),
  completedAt: bigint("completed_at", { mode: "number" }),
  completed: boolean("completed").notNull().default(false),
  pomodoroCount: integer("pomodoro_count").notNull().default(0),
});

// ── pomodoro_sessions ─────────────────────────────────────────
export const pomodoroSessions = pgTable("pomodoro_sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  todoId: text("todo_id").notNull(),
  weeklyGoalId: text("weekly_goal_id"),
  type: sessionTypeEnum("type").notNull().default("work"),
  startedAt: bigint("started_at", { mode: "number" }).notNull(),
  endedAt: bigint("ended_at", { mode: "number" }),
  durationMinutes: integer("duration_minutes"),
  interrupted: boolean("interrupted").notNull().default(false),
});

// ── weekly_goals ──────────────────────────────────────────────
export const weeklyGoals = pgTable("weekly_goals", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: bigint("start_date", { mode: "number" }).notNull(),
  endDate: bigint("end_date", { mode: "number" }).notNull(),
  totalHours: integer("total_hours").notNull().default(0),
  status: goalStatusEnum("status").notNull().default("active"),
  completionPercentage: integer("completion_percentage").notNull().default(0),
  review: text("review"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
