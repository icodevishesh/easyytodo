"use client";

import React, { useMemo, useState } from "react";
import { useDashboard, fmt } from "../dashboard-provider";
import { ClipboardCheck, ClipboardPen, AlertCircle } from "lucide-react";
import { type Todo } from "@/lib/db";

export default function HistoryPage() {
  const { historyTodos, loading } = useDashboard();
  const [now] = useState(() => Date.now());

  const completed = useMemo(() => {
    return historyTodos.filter(t => t.completed);
  }, [historyTodos]);

  const incomplete = useMemo(() => {
    return historyTodos.filter(t => !t.completed);
  }, [historyTodos]);

  return (
    <section className="py-6 grid gap-6 animate-fade-in">
      <div>
        <p className="text-sm text-zinc-400">Tasks created more than 7 days ago.</p>
      </div>
      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {/* Completed Column */}
          <div className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-base font-semibold text-app-accent">
              <ClipboardCheck size={18} />
              <span>Completed</span>
              <span className="rounded-full bg-app-soft px-2 py-0.5 text-xs text-zinc-400">
                {completed.length}
              </span>
            </h3>
            {completed.length === 0 && <p className="empty-state">No completed tasks in history.</p>}
            {completed.map(t => (
              <HistoryCard key={t.id} todo={t} now={now} />
            ))}
          </div>

          {/* Incomplete Column */}
          <div className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-400">
              <ClipboardPen size={18} />
              <span>Incomplete</span>
              <span className="rounded-full bg-app-soft px-2 py-0.5 text-xs text-zinc-400">
                {incomplete.length}
              </span>
            </h3>
            {incomplete.length === 0 && <p className="empty-state">No incomplete tasks in history.</p>}
            {incomplete.map(t => (
              <HistoryCard key={t.id} todo={t} now={now} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ── HistoryCard Component ─────────────────────────────────────

function HistoryCard({ todo, now }: { todo: Todo; now: number }) {
  const overdue = !todo.completed && todo.dueDate < now;
  return (
    <article
      className={`rounded-lg border bg-app-panel p-4 transition-all duration-200 hover:shadow-sm ${
        todo.completed
          ? "border-app-line opacity-75 hover:opacity-100"
          : overdue
          ? "border-red-500/40 bg-red-500/5 hover:border-red-400"
          : "border-app-line hover:border-zinc-500"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {overdue && <AlertCircle size={14} className="shrink-0 text-red-400" />}
            <h3 className={`font-['Cause'] break-words font-semibold ${overdue ? "text-red-300" : "text-zinc-200"}`}>
              {todo.title}
            </h3>
          </div>
          {todo.description && <p className="font-['Cause'] mt-1 text-sm text-zinc-400">{todo.description}</p>}
        </div>
        <span
          className={
            todo.completed
              ? "status status-done"
              : overdue
              ? "shrink-0 rounded-full border border-red-400 px-2.5 py-1 text-xs font-semibold text-red-400"
              : "status text-zinc-400 border-zinc-500"
          }
        >
          {todo.completed ? "Done" : overdue ? "Overdue" : "Incomplete"}
        </span>
      </div>
      <dl className="font-['Cause'] mt-3 grid gap-1 text-xs text-zinc-500 sm:grid-cols-2 border-t border-app-line/20 pt-2.5">
        <div>
          <dt className="text-[10px] text-zinc-400 uppercase">Created</dt>
          <dd className="mt-0.5 text-zinc-400">{fmt(todo.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-[10px] text-zinc-400 uppercase">Due</dt>
          <dd className={`mt-0.5 ${overdue ? "text-red-400" : "text-zinc-400"}`}>{fmt(todo.dueDate)}</dd>
        </div>
        {todo.completedAt && (
          <div className="sm:col-span-2">
            <dt className="text-[10px] text-zinc-400 uppercase">Completed</dt>
            <dd className="mt-0.5 text-zinc-400">{fmt(todo.completedAt)}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}
