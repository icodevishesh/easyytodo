"use client";

import React, { useMemo } from "react";
import { useDashboard, toDateLocal, fromDateLocal, fmtDate } from "../dashboard-provider";
import { Plus, Trash2, Pencil } from "lucide-react";
import { type WeeklyGoal, type GoalStatus } from "@/lib/db";

const STATUS_LABELS: Record<GoalStatus, string> = {
  active: "Active",
  in_progress: "In Progress",
  achieved: "Achieved",
};

const STATUS_COLORS: Record<GoalStatus, string> = {
  active: "border-app-accent text-app-accent",
  in_progress: "border-yellow-400 text-yellow-400",
  achieved: "border-green-400 text-green-400",
};

export default function GoalsPage() {
  const {
    goals,
    todos,
    historyTodos,
    goalDraft,
    setGoalDraft,
    editingGoalId,
    showGoalForm,
    setShowGoalForm,
    goalWorkedMinutes,
    saveGoal,
    editGoal,
    removeGoal,
    resetGoalForm,
  } = useDashboard();

  const allTodos = useMemo(() => {
    return [...todos, ...historyTodos];
  }, [todos, historyTodos]);

  return (
    <section className="py-6 grid gap-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-400">Plan your week and track progress through linked tasks.</p>
        </div>
        {!showGoalForm && (
          <button
            className="primary-button inline-flex items-center gap-2 cursor-pointer"
            type="button"
            onClick={() => setShowGoalForm(true)}
          >
            <Plus size={16} />
            <span>New goal</span>
          </button>
        )}
      </div>

      {showGoalForm && (
        <form className="rounded-lg border border-app-line bg-app-panel p-5 animate-fade-in" onSubmit={saveGoal}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-lg">{editingGoalId ? "Edit goal" : "New goal"}</h3>
            <button className="ghost-button cursor-pointer" type="button" onClick={resetGoalForm}>
              Cancel
            </button>
          </div>
          <label className="field">
            <span>Title</span>
            <input
              autoFocus
              value={goalDraft.title}
              onChange={e => setGoalDraft(c => ({ ...c, title: e.target.value }))}
              placeholder="Goal title"
              required
            />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              value={goalDraft.description || ""}
              onChange={e => setGoalDraft(c => ({ ...c, description: e.target.value }))}
              placeholder="What do you want to achieve?"
              rows={3}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field mb-0">
              <span>Start date</span>
              <input
                type="date"
                value={toDateLocal(goalDraft.startDate)}
                onChange={e => setGoalDraft(c => ({ ...c, startDate: fromDateLocal(e.target.value) }))}
                required
              />
            </label>
            <label className="field mb-0">
              <span>End date</span>
              <input
                type="date"
                value={toDateLocal(goalDraft.endDate)}
                onChange={e => setGoalDraft(c => ({ ...c, endDate: fromDateLocal(e.target.value) }))}
                required
              />
            </label>
          </div>
          <label className="field mt-4">
            <span>Weekly focus target (hours)</span>
            <input
              type="number"
              min="0"
              max="168"
              value={goalDraft.totalHours}
              onChange={e =>
                setGoalDraft(c => ({ ...c, totalHours: Math.max(0, parseInt(e.target.value) || 0) }))
              }
              placeholder="e.g. 14"
            />
          </label>
          <label className="field mt-4">
            <span>Status</span>
            <select
              value={goalDraft.status}
              onChange={e => setGoalDraft(c => ({ ...c, status: e.target.value as GoalStatus }))}
              className="w-full rounded-md border border-app-line bg-app-soft px-3 py-3 text-white outline-none transition focus:border-app-accent"
            >
              <option value="active">Active</option>
              <option value="in_progress">In Progress</option>
              <option value="achieved">Achieved</option>
            </select>
          </label>
          <label className="field">
            <span>Review / Notes</span>
            <textarea
              value={goalDraft.review || ""}
              onChange={e => setGoalDraft(c => ({ ...c, review: e.target.value }))}
              placeholder="Reflections, blockers, wins…"
              rows={3}
            />
          </label>
          <button className="primary-button mt-2 w-full cursor-pointer flex items-center gap-2 justify-center" type="submit">
            <Pencil size={16} />
            <span>{editingGoalId ? "Save changes" : "Create goal"}</span>
          </button>
        </form>
      )}

      {goals.length === 0 && !showGoalForm && (
        <p className="empty-state">No goals yet. Create one to start planning your week.</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {goals.map(goal => {
          const linked = allTodos.filter(t => t.weeklyGoalId === goal.id);
          const workedMins = goalWorkedMinutes[goal.id] ?? 0;
          const targetMins = (goal.totalHours ?? 0) * 60;
          const focusPct = targetMins > 0 ? Math.min(100, Math.round((workedMins / targetMins) * 100)) : null;
          const fmtMins = (m: number) =>
            m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60 > 0 ? `${m % 60}m` : ""}`.trim();

          return (
            <article key={goal.id} className="rounded-lg border border-app-line bg-app-panel p-5 transition-all duration-200 hover:shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-base break-words text-zinc-200">{goal.title}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {fmtDate(goal.startDate)} → {fmtDate(goal.endDate)}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[goal.status]}`}>
                  {STATUS_LABELS[goal.status]}
                </span>
              </div>
              {goal.description && <p className="text-sm text-zinc-400 mb-3">{goal.description}</p>}

              {/* Task completion progress */}
              <div className="mb-3">
                <div className="mb-1.5 flex justify-between text-xs text-zinc-400">
                  <span>Task progress</span>
                  <span>{goal.completionPercentage}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-app-soft">
                  <div
                    className="h-full rounded-full bg-app-accent transition-all duration-500"
                    style={{ width: `${goal.completionPercentage}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {linked.filter(t => t.completed).length} / {linked.length} tasks done
                </p>
              </div>

              {/* Focus hours progress */}
              {focusPct !== null && (
                <div className="mb-3">
                  <div className="mb-1.5 flex justify-between text-xs text-zinc-400">
                    <span className="flex items-center gap-1">🍅 Focus time</span>
                    <span>
                      {fmtMins(workedMins)} / {goal.totalHours}h{" "}
                      <span className="text-app-accent font-semibold ml-1">{focusPct}%</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-app-soft">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${focusPct}%`,
                        background: focusPct >= 100 ? "#4ade80" : "#60a5fa",
                      }}
                    />
                  </div>
                </div>
              )}

              {goal.review && (
                <div className="mb-3 rounded-md bg-app-soft px-3 py-2 text-xs text-zinc-400 italic">
                  &ldquo;{goal.review}&rdquo;
                </div>
              )}

              <div className="flex gap-2 border-t border-app-line/20 pt-4 mt-4">
                <button className="secondary-button cursor-pointer" type="button" onClick={() => editGoal(goal)}>
                  Edit
                </button>
                <button
                  className="danger-button cursor-pointer inline-flex items-center gap-1"
                  type="button"
                  onClick={() => removeGoal(goal.id)}
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
