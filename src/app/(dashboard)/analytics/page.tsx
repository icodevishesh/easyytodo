"use client";

import React, { useMemo, useState } from "react";
import { useDashboard } from "@/app/(dashboard)/dashboard-provider";
import { type Todo, type PomodoroSession } from "@/lib/db";

// ── Analytics Builder ─────────────────────────────────────────

function buildAnalytics(todos: Todo[], sessions: PomodoroSession[], now: number) {
  const startToday = (() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();

  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
  const completed = todos.filter(t => t.completed);

  // ── Daily ──
  const todayCreated = todos.filter(t => t.createdAt >= startToday);
  const todayCompleted = completed.filter(t => (t.completedAt ?? 0) >= startToday);
  const todayIncomplete = todayCreated.filter(t => !t.completed);

  // Pomodoro time per todo today (work sessions only, completed)
  const todaySessions = sessions.filter(
    s => s.type === "work" && s.startedAt >= startToday && s.endedAt != null && !s.interrupted
  );
  const todayFocusMinutes = todaySessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);

  // Per-todo focus time today
  const todoFocusMap: Record<string, number> = {};
  for (const s of todaySessions) {
    todoFocusMap[s.todoId] = (todoFocusMap[s.todoId] ?? 0) + (s.durationMinutes ?? 0);
  }
  // Build list of todos that had focus time today
  const todayFocusTodos = Object.entries(todoFocusMap)
    .map(([todoId, mins]) => ({ todo: todos.find(t => t.id === todoId), mins }))
    .filter(x => x.todo != null)
    .sort((a, b) => b.mins - a.mins) as { todo: Todo; mins: number }[];

  return {
    total: todos.length,
    open: todos.filter(t => !t.completed).length,
    completed: completed.length,
    daily: {
      created: todayCreated.length,
      completed: todayCompleted.length,
      incomplete: todayIncomplete.length,
      successRate: percentage(todayCompleted.length, todayCreated.length),
      focusMinutes: todayFocusMinutes,
      focusTodos: todayFocusTodos,
    },
    weekly: {
      created: todos.filter(t => t.createdAt >= weekAgo).length,
      completed: completed.filter(t => (t.completedAt ?? 0) >= weekAgo).length,
      completionRate: percentage(
        completed.filter(t => (t.completedAt ?? 0) >= weekAgo).length,
        todos.filter(t => t.createdAt >= weekAgo).length
      ),
    },
    monthly: {
      created: todos.filter(t => t.createdAt >= monthAgo).length,
      completed: completed.filter(t => (t.completedAt ?? 0) >= monthAgo).length,
      completionRate: percentage(
        completed.filter(t => (t.completedAt ?? 0) >= monthAgo).length,
        todos.filter(t => t.createdAt >= monthAgo).length
      ),
    },
  };
}

function percentage(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

function fmtFocusTime(mins: number) {
  if (mins === 0) return "0m";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Main Page Component ──────────────────────────────────────

export default function AnalyticsPage() {
  const { todos, historyTodos, pomodoroSessions, loading } = useDashboard();
  const [now] = useState(() => Date.now());

  const allTodos = useMemo(() => {
    return [...todos, ...historyTodos];
  }, [todos, historyTodos]);

  const analytics = useMemo(() => {
    return buildAnalytics(allTodos, pomodoroSessions, now);
  }, [allTodos, pomodoroSessions, now]);


  if (loading) {
    return <p className="empty-state">Loading analytics…</p>;
  }

  const { daily } = analytics;

  return (
    <section className="grid gap-6 py-6 animate-fade-in">
      {/* ── Daily ── */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="text-app-accent">Today</span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DailyMetric label="Completed" value={daily.completed} color="text-app-accent" />
          <DailyMetric label="Incomplete" value={daily.incomplete} color="text-zinc-300" />
          <DailyMetric
            label="Success rate"
            value={`${daily.successRate}%`}
            color={
              daily.successRate >= 80
                ? "text-green-400"
                : daily.successRate >= 50
                ? "text-yellow-400"
                : "text-red-400"
            }
          />
          <DailyMetric label="Focus time" value={fmtFocusTime(daily.focusMinutes)} color="text-blue-400" />
        </div>

        {/* Success rate bar */}
        {daily.created > 0 && (
          <div className="mt-4 rounded-lg border border-app-line bg-app-panel p-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-zinc-400">Daily success rate</span>
              <span className="font-semibold text-zinc-200">
                {daily.completed} / {daily.created} tasks
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-app-soft">
              <div
                className="h-full rounded-full bg-app-accent transition-all duration-500"
                style={{ width: `${daily.successRate}%` }}
              />
            </div>
            <div className="mt-2 flex gap-4 text-xs text-zinc-500">
              <span className="text-app-accent">✓ {daily.completed} done</span>
              <span>○ {daily.incomplete} open</span>
            </div>
          </div>
        )}

        {/* Per-todo focus time today */}
        {daily.focusTodos.length > 0 && (
          <div className="mt-4 rounded-lg border border-app-line bg-app-panel p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
              🍅 Focus time by task today
            </h3>
            <div className="flex flex-col gap-2">
              {daily.focusTodos.map(({ todo, mins }) => {
                const maxMins = daily.focusTodos[0].mins;
                const pct = Math.max(6, Math.round((mins / maxMins) * 100));
                return (
                  <div key={todo.id}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-zinc-300 truncate max-w-[70%]">{todo.title}</span>
                      <span className="text-blue-400 font-semibold shrink-0">{fmtFocusTime(mins)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-app-soft">
                      <div
                        className="h-full rounded-full bg-blue-400/70 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── All-time totals ── */}
      <div>
        <h2 className="text-lg font-semibold mb-3 text-zinc-400">All time</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Total tasks" value={analytics.total} />
          <Metric label="Open" value={analytics.open} />
          <Metric label="Completed" value={analytics.completed} />
        </div>
      </div>

      {/* ── Weekly / Monthly ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <InsightPanel title="Weekly insights" data={analytics.weekly} />
        <InsightPanel title="Monthly insights" data={analytics.monthly} />
      </div>
    </section>
  );
}

// ── Supporting Metric Components ──────────────────────────────

function DailyMetric({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <article className="rounded-lg border border-app-line bg-app-panel p-4 transition duration-200 hover:shadow-sm">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-lg border border-app-line bg-app-panel p-5 transition duration-200 hover:shadow-sm">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-3 text-4xl font-semibold text-app-accent">{value}</p>
    </article>
  );
}

function InsightPanel({
  title,
  data,
}: {
  title: string;
  data: { created: number; completed: number; completionRate: number };
}) {
  return (
    <article className="rounded-lg border border-app-line bg-app-panel p-5 transition duration-200 hover:shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-200">{title}</h2>
      <div className="mt-5 grid gap-4">
        <AnalyticsRow label="Created" value={data.created} max={Math.max(data.created, data.completed, 1)} />
        <AnalyticsRow label="Completed" value={data.completed} max={Math.max(data.created, data.completed, 1)} />
        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-zinc-400">Completion rate</span>
            <span className="text-zinc-200">{data.completionRate}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-app-soft">
            <div className="h-full bg-app-accent" style={{ width: `${data.completionRate}%` }} />
          </div>
        </div>
      </div>
    </article>
  );
}

function AnalyticsRow({ label, value, max }: { label: string; value: number; max: number }) {
  const width = Math.max(6, Math.round((value / max) * 100));
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-200 font-medium">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-app-soft">
        <div className="h-full bg-white" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
