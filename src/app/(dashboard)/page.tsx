"use client";

import React, { useMemo, useState } from "react";
import { useDashboard, toDatetimeLocal, fromDatetimeLocal, startOfToday, fmt } from "@/app/(dashboard)/dashboard-provider";
import { Clipboard, Pencil, ClipboardPen, ClipboardCheck, AlertCircle, CheckCheck, X } from "lucide-react";
import { type Todo, type WeeklyGoal } from "@/lib/db";
  
export default function TasksPage() {
  const {
    todos,
    goals,
    draft,
    setDraft,
    editingId,
    dropTarget,
    setDropTarget,
    loading,
    saveTodo,
    editTodo,
    moveTodo,
    removeTodo,
    resetForm,
  } = useDashboard();

  const [now] = useState(() => Date.now());

  const openTodos = useMemo(() => {
    return todos.filter(t => !t.completed).sort((a, b) => a.createdAt - b.createdAt);
  }, [todos]);

  const completedTodos = useMemo(() => {
    return todos.filter(t => t.completed);
  }, [todos]);

  const onDrop = async (e: React.DragEvent<HTMLElement>, completed: boolean) => {
    e.preventDefault();
    setDropTarget(null);
    const id = e.dataTransfer.getData("text/todo-id");
    if (id) {
      await moveTodo(id, completed);
    }
  };

  return (
    <section className="grid flex-1 gap-5 py-6 lg:grid-cols-[360px_1fr]">
      {/* Form */}
      <form className="h-fit rounded-lg border border-app-line bg-app-panel p-5 animate-fade-in" onSubmit={saveTodo}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clipboard size={18} />
            <span>{editingId ? "Edit task" : "New task"}</span>
          </h2>
          {editingId && (
            <button className="ghost-button cursor-pointer" type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
        <label className="field">
          <span>Title</span>
          <input
            autoFocus
            value={draft.title}
            onChange={e => setDraft(c => ({ ...c, title: e.target.value }))}
            placeholder="Write the task title"
            className="font-['Cause']"
            required
          />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea
            value={draft.description || ""}
            onChange={e => setDraft(c => ({ ...c, description: e.target.value }))}
            placeholder="Add optional context"
            className="font-['Cause']"
            rows={3}
          />
        </label>
        <label className="field">
          <span>Due date</span>
          <input
            type="datetime-local"
            value={toDatetimeLocal(draft.dueDate)}
            onChange={e => setDraft(c => ({ ...c, dueDate: fromDatetimeLocal(e.target.value) }))}
          />
        </label>
        {goals.length > 0 && (
          <label className="field">
            <span>Link to weekly goal</span>
            <select
              value={draft.weeklyGoalId ?? ""}
              onChange={e => setDraft(c => ({ ...c, weeklyGoalId: e.target.value || undefined }))}
              className="w-full rounded-md border border-app-line bg-app-soft px-3 py-3 text-white outline-none transition focus:border-app-accent"
            >
              <option value="">— None —</option>
              {goals.map(g => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          className="primary-button hover:brightness-125 mt-3 w-full cursor-pointer flex items-center gap-2 justify-center"
          type="submit"
        >
          <Pencil size={16} />
          <span>{editingId ? "Save changes" : "Create task"}</span>
        </button>
      </form>

      {/* Columns */}
      <div className="grid min-h-[560px] gap-5 xl:grid-cols-2">
        {loading ? (
          <p className="empty-state col-span-2">Loading…</p>
        ) : (
          <>
            <TaskColumn
              icon={<ClipboardPen size={18} />}
              title="Open"
              todos={openTodos}
              emptyText="No open tasks this week."
              active={dropTarget === "open"}
              onDragEnter={() => setDropTarget("open")}
              onDrop={e => onDrop(e, false)}
              onEdit={editTodo}
              onDelete={removeTodo}
              onToggleComplete={moveTodo}
              now={now}
            />
            <TaskColumn
              icon={<ClipboardCheck size={18} />}
              title="Completed"
              todos={completedTodos}
              emptyText="Drag finished tasks here."
              active={dropTarget === "completed"}
              onDragEnter={() => setDropTarget("completed")}
              onDrop={e => onDrop(e, true)}
              onEdit={editTodo}
              onDelete={removeTodo}
              onToggleComplete={moveTodo}
              now={now}
            />
          </>
        )}
      </div>
    </section>
  );
}

// ── TaskColumn Component ──────────────────────────────────────

interface TaskColumnProps {
  icon: React.ReactNode;
  title: string;
  todos: Todo[];
  emptyText: string;
  active: boolean;
  onDragEnter: () => void;
  onDrop: (e: React.DragEvent<HTMLElement>) => void;
  onEdit: (t: Todo) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  now: number;
}

function TaskColumn({
  icon,
  title,
  todos,
  emptyText,
  active,
  onDragEnter,
  onDrop,
  onEdit,
  onDelete,
  onToggleComplete,
  now,
}: TaskColumnProps) {
  return (
    <section
      className={`flex min-h-[320px] flex-col rounded-lg border bg-app-panel p-4 transition duration-200 ${
        active ? "border-app-accent shadow-md shadow-app-accent/5" : "border-app-line"
      }`}
      onDragOver={e => e.preventDefault()}
      onDragEnter={onDragEnter}
      onDrop={onDrop}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </h2>
        <span className="rounded-full bg-app-soft px-3 py-1 text-sm text-zinc-400 font-medium">
          {todos.length}
        </span>
      </div>
      <div
        className={`flex flex-1 flex-col gap-3 ${
          todos.length > 5 ? "max-h-[34rem] overflow-y-auto pr-1 no-scrollbar" : ""
        }`}
      >
        {todos.length === 0 && <p className="empty-state">{emptyText}</p>}
        {todos.map(todo => (
          <TaskCard
            key={todo.id}
            todo={todo}
            now={now}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleComplete={onToggleComplete}
          />
        ))}
      </div>
    </section>
  );
}

// ── TaskCard Component ────────────────────────────────────────

interface TaskCardProps {
  todo: Todo;
  now: number;
  onEdit: (t: Todo) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
}

function TaskCard({ todo, now, onEdit, onDelete, onToggleComplete }: TaskCardProps) {
  const overdue = !todo.completed && todo.dueDate < now;
  return (
    <article
      className={`task-card transition-all duration-200 hover:shadow-md ${
        overdue
          ? "border-red-500/40 bg-red-500/5 hover:border-red-400"
          : "hover:border-app-accent"
      }`}
      draggable
      onDragStart={e => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/todo-id", todo.id);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {overdue && <AlertCircle size={14} className="shrink-0 text-red-400" />}
            <h3 className={`font-['Cause'] break-words text-lg font-semibold ${overdue ? "text-red-300" : ""}`}>
              {todo.title}
            </h3>
          </div>
          {todo.description && (
            <p className="font-['Cause'] mt-1 break-words text-sm leading-6 text-zinc-400">
              {todo.description}
            </p>
          )}
        </div>
        <span
          className={
            todo.completed
              ? "status status-done"
              : overdue
              ? "shrink-0 rounded-full border border-red-400 px-2.5 py-1 text-xs font-semibold text-red-400"
              : "status"
          }
        >
          {todo.completed ? "Done" : overdue ? "Overdue" : "In progress"}
        </span>
      </div>
      
      <dl className="font-['Cause'] mt-4 grid gap-2 text-xs text-zinc-500 sm:grid-cols-2 border-t border-app-line/40 pt-3">
        <div>
          <dt className="text-[10px] text-zinc-400 uppercase tracking-wider">Created</dt>
          <dd className="text-zinc-300 mt-0.5">{fmt(todo.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-[10px] text-zinc-400 uppercase tracking-wider">Due</dt>
          <dd className={`mt-0.5 ${overdue ? "text-red-400 font-medium" : "text-zinc-300"}`}>
            {fmt(todo.dueDate)}
          </dd>
        </div>
        {todo.completedAt && (
          <div className="sm:col-span-2">
            <dt className="text-[10px] text-zinc-400 uppercase tracking-wider">Completed</dt>
            <dd className="text-app-accent mt-0.5">{fmt(todo.completedAt)}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex gap-2 pt-2">
        <button
          className="secondary-button hover:bg-app-accent/20 cursor-pointer"
          type="button"
          onClick={() => onEdit(todo)}
        >
          Edit
        </button>
        <button
          className="danger-button hover:bg-red-500/20 cursor-pointer"
          type="button"
          onClick={() => onDelete(todo.id)}
        >
          Delete
        </button>
        <div className="ml-auto">
          {!todo.completed ? (
            <button
              className="secondary-button cursor-pointer"
              type="button"
              onClick={() => onToggleComplete(todo.id, true)}
              aria-label="Mark completed"
            >
              <CheckCheck size={16} />
            </button>
          ) : (
            <button
              className="ghost-button cursor-pointer"
              type="button"
              onClick={() => onToggleComplete(todo.id, false)}
              aria-label="Mark incomplete"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
