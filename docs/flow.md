- add a pomodoro tab, where user can record working timesession and it will update the weekly total hour progress bar.
- make the pomodoro minimal, cute, interactive matcing the theme, also add sound.
- make a standalone component for pomodoro

// ── pomodoro_sessions ─────────────────────────────────────────
export const pomodoroSessions = pgTable("pomodoro_sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  todoId: text("todo_id").notNull(),           // FK → todos.id
  weeklyGoalId: text("weekly_goal_id"),         // FK → weekly_goals.id (denormalized for easy querying)
  type: sessionTypeEnum("type").notNull().default("work"),
  startedAt: bigint("started_at", { mode: "number" }).notNull(),
  endedAt: bigint("ended_at", { mode: "number" }),      // null = session currently active
  durationMinutes: integer("duration_minutes"),          // set when session ends
  interrupted: boolean("interrupted").notNull().default(false), // stopped before timer finished?
});

// weekly_goals
export const weeklyGoals = pgTable("weekly_goals", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: bigint("start_date", { mode: "number" }).notNull(),
  endDate: bigint("end_date", { mode: "number" }).notNull(),
  totalHours: integer("total_hours").notNull().default(0), // ← target eg: 14hrs
  status: goalStatusEnum("status").notNull().default("active"),
  completionPercentage: integer("completion_percentage").notNull().default(0),
  review: text("review"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

flow
Start pomodoro              Stop / timer ends
      │                            │
      ▼                            ▼
INSERT pomodoro_session       UPDATE session
  startedAt = now()             endedAt = now()
  endedAt   = null              durationMinutes = (endedAt - startedAt) / 60000
  type      = 'work'            interrupted = false/true
  todoId    = selected todo     
                                     │
                              INCREMENT todos.pomodoroCount
                                     │
                              RECALCULATE weekly goal progress

// Sum only 'work' sessions, ignore breaks
const workedMinutes = await db
  .select({ total: sum(pomodoroSessions.durationMinutes) })
  .from(pomodoroSessions)
  .where(
    and(
      eq(pomodoroSessions.weeklyGoalId, goalId),
      eq(pomodoroSessions.type, "work"),
      isNotNull(pomodoroSessions.endedAt)   // exclude active session
    )
  );

const progress = (workedMinutes / (goal.totalHours * 60)) * 100;

That's the cleanest approach. Pomodoro sessions give you **accurate, intentional work time** — you only record time when you're actually focused. Here's how to design the schema:

---

## Schema Design

```typescript
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
  weeklyGoalId: text("weekly_goal_id"),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  dueDate: bigint("due_date", { mode: "number" }).notNull(),
  completedAt: bigint("completed_at", { mode: "number" }),
  completed: boolean("completed").notNull().default(false),
  pomodoroCount: integer("pomodoro_count").notNull().default(0), // ← total completed pomodoros
});

// ── pomodoro_sessions ─────────────────────────────────────────
export const pomodoroSessions = pgTable("pomodoro_sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  todoId: text("todo_id").notNull(),           // FK → todos.id
  weeklyGoalId: text("weekly_goal_id"),         // FK → weekly_goals.id (denormalized for easy querying)
  type: sessionTypeEnum("type").notNull().default("work"),
  startedAt: bigint("started_at", { mode: "number" }).notNull(),
  endedAt: bigint("ended_at", { mode: "number" }),      // null = session currently active
  durationMinutes: integer("duration_minutes"),          // set when session ends
  interrupted: boolean("interrupted").notNull().default(false), // stopped before timer finished?
});

// ── weekly_goals ──────────────────────────────────────────────
export const weeklyGoals = pgTable("weekly_goals", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: bigint("start_date", { mode: "number" }).notNull(),
  endDate: bigint("end_date", { mode: "number" }).notNull(),
  totalHours: integer("total_hours").notNull().default(0), // ← target eg: 14hrs
  status: goalStatusEnum("status").notNull().default("active"),
  completionPercentage: integer("completion_percentage").notNull().default(0),
  review: text("review"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
```

---

## How the Data Flows

```
Start pomodoro              Stop / timer ends
      │                            │
      ▼                            ▼
INSERT pomodoro_session       UPDATE session
  startedAt = now()             endedAt = now()
  endedAt   = null              durationMinutes = (endedAt - startedAt) / 60000
  type      = 'work'            interrupted = false/true
  todoId    = selected todo     
                                     │
                              INCREMENT todos.pomodoroCount
                                     │
                              RECALCULATE weekly goal progress
```

---

## Progress Bar Calculation

```ts
// Sum only 'work' sessions, ignore breaks
const workedMinutes = await db
  .select({ total: sum(pomodoroSessions.durationMinutes) })
  .from(pomodoroSessions)
  .where(
    and(
      eq(pomodoroSessions.weeklyGoalId, goalId),
      eq(pomodoroSessions.type, "work"),
      isNotNull(pomodoroSessions.endedAt)   // exclude active session
    )
  );

const progress = (workedMinutes / (goal.totalHours * 60)) * 100;
```

---

## Key Design Decisions Explained

| Field | Why |
|---|---|
| `weeklyGoalId` on session | Avoids a JOIN through todos every time you calculate progress |
| `interrupted` flag | Lets you optionally exclude or discount sessions you bailed on early |
| `durationMinutes` stored | Avoid recalculating `endedAt - startedAt` repeatedly; also survives if timestamps drift |
| `pomodoroCount` on todo | Quick display ("🍅 ×3") without querying sessions table |
| `endedAt = null` | Natural way to detect a currently running session — enforce one active session per user in app logic |