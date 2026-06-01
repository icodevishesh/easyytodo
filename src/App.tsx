"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getRecentTodos, getHistoryTodos, addTodo, updateTodo, deleteTodo,
  getWeeklyGoals, addWeeklyGoal, updateWeeklyGoal, deleteWeeklyGoal,
  recalcGoalCompletion, getRecentPomodoroSessions, getGoalWorkedMinutes,
  type Todo, type WeeklyGoal, type GoalStatus, type PomodoroSession,
} from "./lib/db";
import { signOut } from "./app/actions/auth";
import {
  Panda, Clipboard, ClipboardCheck, ClipboardPen, Pencil, Moon, Sun, Cat,
  CheckCheck, X, LogOut, History, Target, BarChart2, Plus, Trash2,
  AlertCircle, Timer,
} from "lucide-react";
import PomodoroTimer from "./app/components/PomodoroTimer";

interface AppProps { userId: string; userEmail: string; userName: string; }
// type View = "tasks" | "history" | "goals" | "analytics" | "pomodoro";
type View = "tasks" | "pomodoro" | "goals" | "analytics" | "history";
type Draft = Pick<Todo, "title" | "description" | "dueDate" | "weeklyGoalId">;
type GoalDraft = Pick<WeeklyGoal, "title" | "description" | "startDate" | "endDate" | "totalHours" | "status" | "review">;

const startOfToday = () => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); };
const endOfWeek = () => startOfToday() + 7 * 24 * 60 * 60 * 1000 - 1;

const fmt = (ts?: number) => ts
  ? new Intl.DateTimeFormat(undefined, { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }).format(ts)
  : "Not set";

const fmtDate = (ts: number) =>
  new Intl.DateTimeFormat(undefined, { month:"short", day:"numeric", year:"numeric" }).format(ts);

const toDatetimeLocal = (ts: number) => {
  const d = new Date(ts);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const toDateLocal = (ts: number) => {
  const d = new Date(ts);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};
const fromDatetimeLocal = (v: string) => new Date(v).getTime();
const fromDateLocal = (v: string) => new Date(v).getTime();

const blankDraft = (): Draft => ({ title:"", description:"", dueDate: Date.now(), weeklyGoalId: undefined });
const blankGoalDraft = (): GoalDraft => ({
  title:"", description:"", startDate: startOfToday(), endDate: endOfWeek(),
  totalHours: 0, status:"active", review:"",
});

function App({ userId, userEmail, userName }: AppProps) {
  const [theme, setTheme] = useState<"dark"|"light">(() => {
    if (typeof window === "undefined") return "dark";
    return window.localStorage.getItem("app-theme") === "light" ? "light" : "dark";
  });
  const [view, setView] = useState<View>("tasks");
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [dropTarget, setDropTarget] = useState<"open"|"completed"|null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [historyTodos, setHistoryTodos] = useState<Todo[]>([]);
  const [goals, setGoals] = useState<WeeklyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [pomodoroSessions, setPomodoroSessions] = useState<PomodoroSession[]>([]);
  const [goalWorkedMinutes, setGoalWorkedMinutes] = useState<Record<string, number>>({});
  // Goal form
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(blankGoalDraft);
  const [editingGoalId, setEditingGoalId] = useState<string|null>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [recent, history, goalList] = await Promise.all([
        getRecentTodos(userId),
        getHistoryTodos(userId),
        getWeeklyGoals(userId),
      ]);
      setTodos(recent);
      setHistoryTodos(history);
      setGoals(goalList);
      setError(null);

      // Pomodoro data — graceful fallback if table not yet migrated
      try {
        const sessions = await getRecentPomodoroSessions(userId);
        setPomodoroSessions(sessions);
        if (goalList.length > 0) {
          const entries = await Promise.all(
            goalList.map(async g => [g.id, await getGoalWorkedMinutes(userId, g.id)] as [string, number])
          );
          setGoalWorkedMinutes(Object.fromEntries(entries));
        }
      } catch { /* pomodoro_sessions table not yet created — ignore */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("app-theme", theme);
  }, [theme]);

  const now = Date.now();
  const openTodos = todos.filter(t => !t.completed).sort((a,b) => a.createdAt - b.createdAt);
  const completedTodos = todos.filter(t => t.completed);
  const allTodos = useMemo(() => [...todos, ...historyTodos], [todos, historyTodos]);
  const analytics = useMemo(() => buildAnalytics(allTodos, pomodoroSessions), [allTodos, pomodoroSessions]);

  const resetForm = () => { setDraft(blankDraft()); setEditingId(null); };

  const saveTodo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const title = draft.title.trim();
    const description = draft.description?.trim();
    if (!title) return;
    try {
      if (editingId) {
        const current = todos.find(t => t.id === editingId);
        await updateTodo(userId, editingId, {
          title, description, dueDate: draft.dueDate,
          weeklyGoalId: draft.weeklyGoalId,
          completedAt: current?.completed ? (current.completedAt ?? Date.now()) : undefined,
        });
        if (draft.weeklyGoalId) await recalcGoalCompletion(userId, draft.weeklyGoalId);
      } else {
        await addTodo(userId, {
          id: crypto.randomUUID(), title, description,
          createdAt: Date.now(), dueDate: draft.dueDate || startOfToday(),
          completedAt: undefined, completed: false,
          weeklyGoalId: draft.weeklyGoalId,
        });
        if (draft.weeklyGoalId) await recalcGoalCompletion(userId, draft.weeklyGoalId);
      }
      resetForm();
      await fetchAll();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to save"); }
  };

  const editTodo = (todo: Todo) => {
    setView("tasks");
    setEditingId(todo.id);
    setDraft({ title: todo.title, description: todo.description ?? "", dueDate: todo.dueDate, weeklyGoalId: todo.weeklyGoalId });
  };

  const moveTodo = async (id: string, completed: boolean) => {
    try {
      const todo = todos.find(t => t.id === id);
      await updateTodo(userId, id, { completed, completedAt: completed ? Date.now() : undefined });
      if (todo?.weeklyGoalId) await recalcGoalCompletion(userId, todo.weeklyGoalId);
      await fetchAll();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to update"); }
  };

  const removeTodo = async (id: string) => {
    try {
      const todo = todos.find(t => t.id === id);
      await deleteTodo(userId, id);
      if (todo?.weeklyGoalId) await recalcGoalCompletion(userId, todo.weeklyGoalId);
      await fetchAll();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to delete"); }
  };

  const onDrop = async (e: React.DragEvent<HTMLElement>, completed: boolean) => {
    e.preventDefault(); setDropTarget(null);
    const id = e.dataTransfer.getData("text/todo-id");
    if (id) await moveTodo(id, completed);
  };

  // ── Goal mutations ───────────────────────────────────────────
  const resetGoalForm = () => { setGoalDraft(blankGoalDraft()); setEditingGoalId(null); setShowGoalForm(false); };

  const saveGoal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const title = goalDraft.title.trim();
    if (!title) return;
    try {
      if (editingGoalId) {
        await updateWeeklyGoal(userId, editingGoalId, {
          title, description: goalDraft.description?.trim(),
          startDate: goalDraft.startDate, endDate: goalDraft.endDate,
          totalHours: goalDraft.totalHours,
          status: goalDraft.status, review: goalDraft.review?.trim(),
        });
      } else {
        const now = Date.now();
        await addWeeklyGoal(userId, {
          id: crypto.randomUUID(), title,
          description: goalDraft.description?.trim(),
          startDate: goalDraft.startDate, endDate: goalDraft.endDate,
          totalHours: goalDraft.totalHours,
          status: goalDraft.status, completionPercentage: 0,
          review: goalDraft.review?.trim(),
          createdAt: now, updatedAt: now,
        });
      }
      resetGoalForm();
      await fetchAll();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to save goal"); }
  };

  const editGoal = (goal: WeeklyGoal) => {
    setEditingGoalId(goal.id);
    setGoalDraft({ title: goal.title, description: goal.description ?? "", startDate: goal.startDate, endDate: goal.endDate, totalHours: goal.totalHours, status: goal.status, review: goal.review ?? "" });
    setShowGoalForm(true);
  };

  const removeGoal = async (id: string) => {
    try { await deleteWeeklyGoal(userId, id); await fetchAll(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to delete goal"); }
  };

  // ── Render ───────────────────────────────────────────────────
  const navTabs: { id: View; label: string; icon: React.ReactNode }[] = [
    { id:"tasks",     label:"Tasks",     icon:<ClipboardPen size={14}/> },
    { id:"history",   label:"History",   icon:<History size={14}/> },
    { id:"goals",     label:"Goals",     icon:<Target size={14}/> },
    { id:"analytics", label:"Analytics", icon:<BarChart2 size={14}/> },
    { id:"pomodoro",  label:"Pomodoro",  icon:<Timer size={14}/> },
  ];

  return (
    <main className="min-h-screen bg-app-bg text-[var(--app-text)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8">
        {/* ── Header ── */}
        <header className="flex flex-col gap-4 border-b border-app-line pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="flex items-center gap-2 mb-4">
              <Panda />
              <p className="text-lg font-bold tracking-[0.18em] text-app-accent">easyytodo</p>
            </span>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
              Today&apos;s work, sorted.
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="secondary-button inline-flex items-center gap-2"
              onClick={() => setTheme(c => c === "dark" ? "light" : "dark")} type="button" aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={16}/> : <Moon size={16}/>}
              {theme === "dark" ? "Day" : "Night"}
            </button>
            <nav className="flex rounded-md border border-app-line bg-app-panel p-1 gap-0.5">
              {navTabs.map(tab => (
                <button key={tab.id}
                  className={`tab inline-flex items-center gap-1.5 ${view === tab.id ? "tab-active" : ""}`}
                  onClick={() => setView(tab.id)} type="button">
                  {tab.icon}{tab.label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {error && (
          <div className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
        )}

        {/* ── Views ── */}
        {view === "tasks" && (
          <TasksView
            todos={todos} openTodos={openTodos} completedTodos={completedTodos}
            goals={goals} draft={draft} setDraft={setDraft}
            editingId={editingId} dropTarget={dropTarget} setDropTarget={setDropTarget}
            loading={loading} now={now}
            onSave={saveTodo} onEdit={editTodo} onDelete={removeTodo}
            onMove={moveTodo} onDrop={onDrop} onResetForm={resetForm}
          />
        )}
        {view === "history" && <HistoryView todos={historyTodos} loading={loading} now={now} />}
        {view === "goals" && (
          <GoalsView
            goals={goals} todos={[...todos, ...historyTodos]}
            goalDraft={goalDraft} setGoalDraft={setGoalDraft}
            editingGoalId={editingGoalId} showGoalForm={showGoalForm}
            setShowGoalForm={setShowGoalForm}
            goalWorkedMinutes={goalWorkedMinutes}
            onSave={saveGoal} onEdit={editGoal} onDelete={removeGoal} onReset={resetGoalForm}
          />
        )}
        {view === "analytics" && <AnalyticsView analytics={analytics} todos={allTodos} pomodoroSessions={pomodoroSessions} />}
        {view === "pomodoro" && (
          <PomodoroTimer
            userId={userId}
            todos={allTodos}
            goals={goals}
          />
        )}

        {/* ── Footer ── */}
        <footer className="mt-auto border-t border-app-line pt-4 pb-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-accent text-sm font-bold text-black select-none">
                {/* {(userName || userEmail).split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase()} */}
                <Cat/>
              </div>
              <div className="min-w-0">
                {userName && userName !== userEmail && (
                  <p className="truncate text-sm font-medium text-[var(--app-text)]">{userName}</p>
                )}
                <p className="truncate text-xs text-zinc-400">{userEmail}</p>
              </div>
            </div>
            <form action={signOut}>
              <button type="submit" className="ghost-button cursor-pointer inline-flex items-center gap-1.5" aria-label="Sign out">
                <LogOut size={14}/><span>Sign out</span>
              </button>
            </form>
          </div>
        </footer>
      </div>
    </main>
  );
}

// ── TasksView ─────────────────────────────────────────────────

interface TasksViewProps {
  todos: Todo[]; openTodos: Todo[]; completedTodos: Todo[];
  goals: WeeklyGoal[]; draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  editingId: string|null; dropTarget: "open"|"completed"|null;
  setDropTarget: React.Dispatch<React.SetStateAction<"open"|"completed"|null>>;
  loading: boolean; now: number;
  onSave: (e: React.FormEvent<HTMLFormElement>) => void;
  onEdit: (t: Todo) => void; onDelete: (id: string) => void;
  onMove: (id: string, completed: boolean) => void;
  onDrop: (e: React.DragEvent<HTMLElement>, completed: boolean) => void;
  onResetForm: () => void;
}

function TasksView({ todos, openTodos, completedTodos, goals, draft, setDraft, editingId,
  dropTarget, setDropTarget, loading, now, onSave, onEdit, onDelete, onMove, onDrop, onResetForm }: TasksViewProps) {
  return (
    <section className="grid flex-1 gap-5 py-6 lg:grid-cols-[360px_1fr]">
      {/* Form */}
      <form className="h-fit rounded-lg border border-app-line bg-app-panel p-5" onSubmit={onSave}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clipboard/>{editingId ? "Edit task" : "New task"}
          </h2>
          {editingId && <button className="ghost-button" type="button" onClick={onResetForm}>Cancel</button>}
        </div>
        <label className="field"><span>Title</span>
          <input autoFocus value={draft.title}
            onChange={e => setDraft(c => ({...c, title: e.target.value}))}
            placeholder="Write the task title" className="font-['Cause']" required/>
        </label>
        <label className="field"><span>Description</span>
          <textarea value={draft.description}
            onChange={e => setDraft(c => ({...c, description: e.target.value}))}
            placeholder="Add optional context" className="font-['Cause']" rows={3}/>
        </label>
        <label className="field"><span>Due date</span>
          <input type="datetime-local" value={toDatetimeLocal(draft.dueDate)}
            onChange={e => setDraft(c => ({...c, dueDate: fromDatetimeLocal(e.target.value)}))}/>
        </label>
        {goals.length > 0 && (
          <label className="field"><span>Link to weekly goal</span>
            <select value={draft.weeklyGoalId ?? ""}
              onChange={e => setDraft(c => ({...c, weeklyGoalId: e.target.value || undefined}))}
              className="w-full rounded-md border border-app-line bg-app-soft px-3 py-3 text-white outline-none transition focus:border-app-accent">
              <option value="">— None —</option>
              {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </label>
        )}
        <button className="primary-button hover:brightness-125 mt-3 w-full cursor-pointer flex items-center gap-2 justify-center" type="submit">
          <Pencil/>{editingId ? "Save changes" : "Create task"}
        </button>
      </form>

      {/* Columns */}
      <div className="grid min-h-[560px] gap-5 xl:grid-cols-2">
        {loading ? <p className="empty-state col-span-2">Loading…</p> : (
          <>
            <TaskColumn icon={<ClipboardPen/>} title="Open" todos={openTodos}
              emptyText="No open tasks this week." active={dropTarget === "open"}
              onDragEnter={() => setDropTarget("open")} onDrop={e => onDrop(e, false)}
              onEdit={onEdit} onDelete={onDelete} onToggleComplete={onMove} now={now}/>
            <TaskColumn icon={<ClipboardCheck/>} title="Completed" todos={completedTodos}
              emptyText="Drag finished tasks here." active={dropTarget === "completed"}
              onDragEnter={() => setDropTarget("completed")} onDrop={e => onDrop(e, true)}
              onEdit={onEdit} onDelete={onDelete} onToggleComplete={onMove} now={now}/>
          </>
        )}
      </div>
    </section>
  );
}

// ── TaskColumn ────────────────────────────────────────────────

interface TaskColumnProps {
  icon: React.ReactNode; title: string; todos: Todo[]; emptyText: string;
  active: boolean; onDragEnter: () => void;
  onDrop: (e: React.DragEvent<HTMLElement>) => void;
  onEdit: (t: Todo) => void; onDelete: (id: string) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  now: number;
}

function TaskColumn({ icon, title, todos, emptyText, active, onDragEnter, onDrop, onEdit, onDelete, onToggleComplete, now }: TaskColumnProps) {
  return (
    <section className={`flex min-h-[320px] flex-col rounded-lg border bg-app-panel p-4 transition ${active ? "border-app-accent" : "border-app-line"}`}
      onDragOver={e => e.preventDefault()} onDragEnter={onDragEnter} onDrop={onDrop}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">{icon}{title}</h2>
        <span className="rounded-full bg-app-soft px-3 py-1 text-sm text-zinc-600 dark:text-zinc-200">{todos.length}</span>
      </div>
      <div className={`flex flex-1 flex-col gap-3 ${todos.length > 5 ? "max-h-[34rem] overflow-y-auto pr-1 no-scrollbar" : ""}`}>
        {todos.length === 0 && <p className="empty-state">{emptyText}</p>}
        {todos.map(todo => <TaskCard key={todo.id} todo={todo} now={now} onEdit={onEdit} onDelete={onDelete} onToggleComplete={onToggleComplete}/>)}
      </div>
    </section>
  );
}

// ── TaskCard ──────────────────────────────────────────────────

interface TaskCardProps {
  todo: Todo; now: number;
  onEdit: (t: Todo) => void; onDelete: (id: string) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
}

function TaskCard({ todo, now, onEdit, onDelete, onToggleComplete }: TaskCardProps) {
  const overdue = !todo.completed && todo.dueDate < now;
  return (
    <article
      className={`task-card ${overdue ? "border-red-500/60 bg-red-500/5 hover:border-red-400" : ""}`}
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/todo-id", todo.id); }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {overdue && <AlertCircle size={14} className="shrink-0 text-red-400"/>}
            <h3 className={`font-['Cause'] break-words text-lg font-semibold ${overdue ? "text-red-300" : ""}`}>{todo.title}</h3>
          </div>
          {todo.description && <p className="font-['Cause'] mt-1 break-words text-sm leading-6 text-zinc-600 dark:text-zinc-300">{todo.description}</p>}
        </div>
        <span className={todo.completed ? "status status-done" : overdue ? "shrink-0 rounded-full border border-red-400 px-2.5 py-1 text-xs font-semibold text-red-400" : "status"}>
          {todo.completed ? "Done" : overdue ? "Overdue" : "In progress"}
        </span>
      </div>
      <dl className="font-['Cause'] mt-4 grid gap-2 text-xs text-zinc-400 sm:grid-cols-2">
        <div><dt>Created</dt><dd>{fmt(todo.createdAt)}</dd></div>
        <div><dt>Due</dt><dd className={overdue ? "text-red-400 font-medium" : ""}>{fmt(todo.dueDate)}</dd></div>
        {todo.completedAt && <div className="sm:col-span-2"><dt>Completed</dt><dd>{fmt(todo.completedAt)}</dd></div>}
      </dl>
      <div className="mt-4 flex gap-2">
        <button className="secondary-button hover:bg-app-accent/20 cursor-pointer" type="button" onClick={() => onEdit(todo)}>Edit</button>
        <button className="danger-button hover:bg-red-500/20 cursor-pointer" type="button" onClick={() => onDelete(todo.id)}>Delete</button>
        <div className="ml-auto">
          {!todo.completed
            ? <button className="secondary-button cursor-pointer" type="button" onClick={() => onToggleComplete(todo.id, true)}><CheckCheck size={16}/></button>
            : <button className="ghost-button cursor-pointer" type="button" onClick={() => onToggleComplete(todo.id, false)}><X size={16}/></button>}
        </div>
      </div>
    </article>
  );
}

// ── HistoryView ───────────────────────────────────────────────

function HistoryView({ todos, loading, now }: { todos: Todo[]; loading: boolean; now: number }) {
  const completed = todos.filter(t => t.completed);
  const incomplete = todos.filter(t => !t.completed);
  return (
    <section className="py-6 grid gap-6">
      <div>
        <h2 className="mb-1 text-xl font-semibold">History</h2>
        <p className="text-sm text-zinc-400">Tasks created more than 7 days ago.</p>
      </div>
      {loading ? <p className="empty-state">Loading…</p> : (
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-base font-semibold text-app-accent">
              <ClipboardCheck size={16}/>Completed <span className="rounded-full bg-app-soft px-2 py-0.5 text-xs text-zinc-400">{completed.length}</span>
            </h3>
            {completed.length === 0 && <p className="empty-state">No completed tasks in history.</p>}
            {completed.map(t => <HistoryCard key={t.id} todo={t} now={now}/>)}
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-400">
              <ClipboardPen size={16}/>Incomplete <span className="rounded-full bg-app-soft px-2 py-0.5 text-xs text-zinc-400">{incomplete.length}</span>
            </h3>
            {incomplete.length === 0 && <p className="empty-state">No incomplete tasks in history.</p>}
            {incomplete.map(t => <HistoryCard key={t.id} todo={t} now={now}/>)}
          </div>
        </div>
      )}
    </section>
  );
}

function HistoryCard({ todo, now }: { todo: Todo; now: number }) {
  const overdue = !todo.completed && todo.dueDate < now;
  return (
    <article className={`rounded-lg border bg-app-panel p-4 ${todo.completed ? "border-app-line opacity-75" : overdue ? "border-red-500/40 bg-red-500/5" : "border-app-line"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {overdue && <AlertCircle size={13} className="shrink-0 text-red-400"/>}
            <h3 className={`font-['Cause'] break-words font-semibold ${overdue ? "text-red-300" : ""}`}>{todo.title}</h3>
          </div>
          {todo.description && <p className="font-['Cause'] mt-1 text-sm text-zinc-500">{todo.description}</p>}
        </div>
        <span className={todo.completed ? "status status-done" : overdue ? "shrink-0 rounded-full border border-red-400 px-2.5 py-1 text-xs font-semibold text-red-400" : "status"}>
          {todo.completed ? "Done" : overdue ? "Overdue" : "Incomplete"}
        </span>
      </div>
      <dl className="font-['Cause'] mt-3 grid gap-1 text-xs text-zinc-500 sm:grid-cols-2">
        <div><dt>Created</dt><dd>{fmt(todo.createdAt)}</dd></div>
        <div><dt>Due</dt><dd className={overdue ? "text-red-400" : ""}>{fmt(todo.dueDate)}</dd></div>
        {todo.completedAt && <div className="sm:col-span-2"><dt>Completed</dt><dd>{fmt(todo.completedAt)}</dd></div>}
      </dl>
    </article>
  );
}

// ── GoalsView ─────────────────────────────────────────────────

const STATUS_LABELS: Record<GoalStatus, string> = { active:"Active", in_progress:"In Progress", achieved:"Achieved" };
const STATUS_COLORS: Record<GoalStatus, string> = {
  active: "border-app-accent text-app-accent",
  in_progress: "border-yellow-400 text-yellow-400",
  achieved: "border-green-400 text-green-400",
};

interface GoalsViewProps {
  goals: WeeklyGoal[]; todos: Todo[];
  goalDraft: GoalDraft; setGoalDraft: React.Dispatch<React.SetStateAction<GoalDraft>>;
  editingGoalId: string|null; showGoalForm: boolean;
  setShowGoalForm: React.Dispatch<React.SetStateAction<boolean>>;
  goalWorkedMinutes: Record<string, number>;
  onSave: (e: React.FormEvent<HTMLFormElement>) => void;
  onEdit: (g: WeeklyGoal) => void; onDelete: (id: string) => void; onReset: () => void;
}

function GoalsView({ goals, todos, goalDraft, setGoalDraft, editingGoalId, showGoalForm, setShowGoalForm, goalWorkedMinutes, onSave, onEdit, onDelete, onReset }: GoalsViewProps) {
  return (
    <section className="py-6 grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Weekly Goals</h2>
          <p className="text-sm text-zinc-400">Plan your week and track progress through linked tasks.</p>
        </div>
        {!showGoalForm && (
          <button className="primary-button inline-flex items-center gap-2 cursor-pointer" type="button" onClick={() => setShowGoalForm(true)}>
            <Plus size={16}/>New goal
          </button>
        )}
      </div>

      {showGoalForm && (
        <form className="rounded-lg border border-app-line bg-app-panel p-5" onSubmit={onSave}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">{editingGoalId ? "Edit goal" : "New goal"}</h3>
            <button className="ghost-button" type="button" onClick={onReset}>Cancel</button>
          </div>
          <label className="field"><span>Title</span>
            <input autoFocus value={goalDraft.title} onChange={e => setGoalDraft(c => ({...c, title: e.target.value}))} placeholder="Goal title" required/>
          </label>
          <label className="field"><span>Description</span>
            <textarea value={goalDraft.description} onChange={e => setGoalDraft(c => ({...c, description: e.target.value}))} placeholder="What do you want to achieve?" rows={3}/>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field mb-0"><span>Start date</span>
              <input type="date" value={toDateLocal(goalDraft.startDate)} onChange={e => setGoalDraft(c => ({...c, startDate: fromDateLocal(e.target.value)}))} required/>
            </label>
            <label className="field mb-0"><span>End date</span>
              <input type="date" value={toDateLocal(goalDraft.endDate)} onChange={e => setGoalDraft(c => ({...c, endDate: fromDateLocal(e.target.value)}))} required/>
            </label>
          </div>
          <label className="field mt-4"><span>Weekly focus target (hours)</span>
            <input type="number" min="0" max="168" value={goalDraft.totalHours}
              onChange={e => setGoalDraft(c => ({...c, totalHours: Math.max(0, parseInt(e.target.value) || 0)}))}
              placeholder="e.g. 14"/>
          </label>
          <label className="field mt-4"><span>Status</span>
            <select value={goalDraft.status} onChange={e => setGoalDraft(c => ({...c, status: e.target.value as GoalStatus}))}
              className="w-full rounded-md border border-app-line bg-app-soft px-3 py-3 text-white outline-none transition focus:border-app-accent">
              <option value="active">Active</option>
              <option value="in_progress">In Progress</option>
              <option value="achieved">Achieved</option>
            </select>
          </label>
          <label className="field"><span>Review / Notes</span>
            <textarea value={goalDraft.review} onChange={e => setGoalDraft(c => ({...c, review: e.target.value}))} placeholder="Reflections, blockers, wins…" rows={3}/>
          </label>
          <button className="primary-button mt-2 w-full cursor-pointer flex items-center gap-2 justify-center" type="submit">
            <Pencil size={16}/>{editingGoalId ? "Save changes" : "Create goal"}
          </button>
        </form>
      )}

      {goals.length === 0 && !showGoalForm && <p className="empty-state">No goals yet. Create one to start planning your week.</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {goals.map(goal => {
          const linked = todos.filter(t => t.weeklyGoalId === goal.id);
          const workedMins = goalWorkedMinutes[goal.id] ?? 0;
          const targetMins = (goal.totalHours ?? 0) * 60;
          const focusPct = targetMins > 0 ? Math.min(100, Math.round((workedMins / targetMins) * 100)) : null;
          const fmtMins = (m: number) => m < 60 ? `${m}m` : `${Math.floor(m/60)}h ${m%60 > 0 ? `${m%60}m` : ""}`.trim();
          return (
            <article key={goal.id} className="rounded-lg border border-app-line bg-app-panel p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-base break-words">{goal.title}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{fmtDate(goal.startDate)} → {fmtDate(goal.endDate)}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[goal.status]}`}>
                  {STATUS_LABELS[goal.status]}
                </span>
              </div>
              {goal.description && <p className="text-sm text-zinc-400 mb-3">{goal.description}</p>}

              {/* Task completion progress */}
              <div className="mb-3">
                <div className="mb-1.5 flex justify-between text-xs text-zinc-400">
                  <span>Task progress</span><span>{goal.completionPercentage}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-app-soft">
                  <div className="h-full rounded-full bg-app-accent transition-all duration-500"
                    style={{ width: `${goal.completionPercentage}%` }}/>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{linked.filter(t=>t.completed).length} / {linked.length} tasks done</p>
              </div>

              {/* Focus hours progress — only shown when totalHours is set */}
              {focusPct !== null && (
                <div className="mb-3">
                  <div className="mb-1.5 flex justify-between text-xs text-zinc-400">
                    <span className="flex items-center gap-1">🍅 Focus time</span>
                    <span>{fmtMins(workedMins)} / {goal.totalHours}h <span className="text-app-accent font-semibold ml-1">{focusPct}%</span></span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-app-soft">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${focusPct}%`, background: focusPct >= 100 ? "#4ade80" : "#60a5fa" }}/>
                  </div>
                </div>
              )}

              {goal.review && (
                <div className="mb-3 rounded-md bg-app-soft px-3 py-2 text-xs text-zinc-400 italic">
                  &ldquo;{goal.review}&rdquo;
                </div>
              )}

              <div className="flex gap-2">
                <button className="secondary-button cursor-pointer" type="button" onClick={() => onEdit(goal)}>Edit</button>
                <button className="danger-button cursor-pointer inline-flex items-center gap-1" type="button" onClick={() => onDelete(goal.id)}>
                  <Trash2 size={13}/>Delete
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// ── Analytics ─────────────────────────────────────────────────

function buildAnalytics(todos: Todo[], sessions: PomodoroSession[]) {
  const now = Date.now();
  const startToday = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); })();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
  const completed = todos.filter(t => t.completed);

  // ── Daily ──────────────────────────────────────────────────
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
      completionRate: percentage(completed.filter(t => (t.completedAt ?? 0) >= weekAgo).length, todos.filter(t => t.createdAt >= weekAgo).length),
    },
    monthly: {
      created: todos.filter(t => t.createdAt >= monthAgo).length,
      completed: completed.filter(t => (t.completedAt ?? 0) >= monthAgo).length,
      completionRate: percentage(completed.filter(t => (t.completedAt ?? 0) >= monthAgo).length, todos.filter(t => t.createdAt >= monthAgo).length),
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

function AnalyticsView({ analytics, todos, pomodoroSessions }: {
  analytics: ReturnType<typeof buildAnalytics>;
  todos: Todo[];
  pomodoroSessions: PomodoroSession[];
}) {
  void todos; void pomodoroSessions; // available for future use
  const { daily } = analytics;

  return (
    <section className="grid gap-6 py-6">

      {/* ── Daily ── */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="text-app-accent">Today</span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DailyMetric label="Completed" value={daily.completed} color="text-app-accent"/>
          <DailyMetric label="Incomplete" value={daily.incomplete} color="text-zinc-300"/>
          <DailyMetric label="Success rate" value={`${daily.successRate}%`} color={daily.successRate >= 80 ? "text-green-400" : daily.successRate >= 50 ? "text-yellow-400" : "text-red-400"}/>
          <DailyMetric label="Focus time" value={fmtFocusTime(daily.focusMinutes)} color="text-blue-400"/>
        </div>

        {/* Success rate bar */}
        {daily.created > 0 && (
          <div className="mt-4 rounded-lg border border-app-line bg-app-panel p-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-zinc-400">Daily success rate</span>
              <span className="font-semibold">{daily.completed} / {daily.created} tasks</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-app-soft">
              <div className="h-full rounded-full bg-app-accent transition-all duration-500"
                style={{ width: `${daily.successRate}%` }}/>
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
                      <div className="h-full rounded-full bg-blue-400/70 transition-all duration-500"
                        style={{ width: `${pct}%` }}/>
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
          <Metric label="Total tasks" value={analytics.total}/>
          <Metric label="Open" value={analytics.open}/>
          <Metric label="Completed" value={analytics.completed}/>
        </div>
      </div>

      {/* ── Weekly / Monthly ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <InsightPanel title="Weekly insights" data={analytics.weekly}/>
        <InsightPanel title="Monthly insights" data={analytics.monthly}/>
      </div>
    </section>
  );
}

function DailyMetric({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <article className="rounded-lg border border-app-line bg-app-panel p-4">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-lg border border-app-line bg-app-panel p-5">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-3 text-4xl font-semibold text-app-accent">{value}</p>
    </article>
  );
}

function InsightPanel({ title, data }: { title: string; data: { created: number; completed: number; completionRate: number } }) {
  return (
    <article className="rounded-lg border border-app-line bg-app-panel p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-5 grid gap-4">
        <AnalyticsRow label="Created" value={data.created} max={Math.max(data.created, data.completed, 1)}/>
        <AnalyticsRow label="Completed" value={data.completed} max={Math.max(data.created, data.completed, 1)}/>
        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-zinc-400">Completion rate</span><span>{data.completionRate}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-app-soft">
            <div className="h-full bg-app-accent" style={{ width: `${data.completionRate}%` }}/>
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
        <span className="text-zinc-400">{label}</span><span>{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-app-soft">
        <div className="h-full bg-white" style={{ width: `${width}%` }}/>
      </div>
    </div>
  );
}

export default App;
