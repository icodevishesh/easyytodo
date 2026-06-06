"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getRecentTodos,
  getHistoryTodos,
  addTodo,
  updateTodo,
  deleteTodo,
  getWeeklyGoals,
  addWeeklyGoal,
  updateWeeklyGoal,
  deleteWeeklyGoal,
  recalcGoalCompletion,
  getRecentPomodoroSessions,
  getGoalWorkedMinutes,
  type Todo,
  type WeeklyGoal,
  type GoalStatus,
  type PomodoroSession,
} from "@/lib/db";

export type Draft = Pick<Todo, "title" | "description" | "dueDate" | "weeklyGoalId">;
export type GoalDraft = Pick<WeeklyGoal, "title" | "description" | "startDate" | "endDate" | "totalHours" | "status" | "review">;

export const startOfToday = () => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); };
export const endOfWeek = () => startOfToday() + 7 * 24 * 60 * 60 * 1000 - 1;

export const fmt = (ts?: number) => ts
  ? new Intl.DateTimeFormat(undefined, { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }).format(ts)
  : "Not set";

export const fmtDate = (ts: number) =>
  new Intl.DateTimeFormat(undefined, { month:"short", day:"numeric", year:"numeric" }).format(ts);

export const toDatetimeLocal = (ts: number) => {
  const d = new Date(ts);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
export const toDateLocal = (ts: number) => {
  const d = new Date(ts);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};
export const fromDatetimeLocal = (v: string) => new Date(v).getTime();
export const fromDateLocal = (v: string) => new Date(v).getTime();

export const blankDraft = (): Draft => ({ title:"", description:"", dueDate: Date.now(), weeklyGoalId: undefined });
export const blankGoalDraft = (): GoalDraft => ({
  title:"", description:"", startDate: startOfToday(), endDate: endOfWeek(),
  totalHours: 0, status:"active", review:"",
});

interface DashboardContextType {
  userId: string;
  userEmail: string;
  userName: string;
  theme: "dark" | "light";
  setTheme: React.Dispatch<React.SetStateAction<"dark" | "light">>;
  toggleTheme: () => void;
  profileIcon: string;
  setProfileIcon: (icon: string) => void;
  todos: Todo[];
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>;
  historyTodos: Todo[];
  goals: WeeklyGoal[];
  pomodoroSessions: PomodoroSession[];
  goalWorkedMinutes: Record<string, number>;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  fetchAll: () => Promise<void>;
  
  // Tasks state
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  editingId: string | null;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  dropTarget: "open" | "completed" | null;
  setDropTarget: React.Dispatch<React.SetStateAction<"open" | "completed" | null>>;
  
  // Tasks handlers
  saveTodo: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  editTodo: (todo: Todo) => void;
  moveTodo: (id: string, completed: boolean) => Promise<void>;
  removeTodo: (id: string) => Promise<void>;
  resetForm: () => void;
  
  // Goals state
  goalDraft: GoalDraft;
  setGoalDraft: React.Dispatch<React.SetStateAction<GoalDraft>>;
  editingGoalId: string | null;
  setEditingGoalId: React.Dispatch<React.SetStateAction<string | null>>;
  showGoalForm: boolean;
  setShowGoalForm: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Goals handlers
  saveGoal: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  editGoal: (goal: WeeklyGoal) => void;
  removeGoal: (id: string) => Promise<void>;
  resetGoalForm: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export default function DashboardProvider({
  children,
  userId,
  userEmail,
  userName,
}: {
  children: React.ReactNode;
  userId: string;
  userEmail: string;
  userName: string;
}) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [profileIcon, setProfileIconRaw] = useState<string>("cat");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [historyTodos, setHistoryTodos] = useState<Todo[]>([]);
  const [goals, setGoals] = useState<WeeklyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pomodoroSessions, setPomodoroSessions] = useState<PomodoroSession[]>([]);
  const [goalWorkedMinutes, setGoalWorkedMinutes] = useState<Record<string, number>>({});
  
  // Tasks state
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<"open" | "completed" | null>(null);

  // Goals state
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(blankGoalDraft);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);

  // Load theme and profile-icon from localStorage
  useEffect(() => {
    const savedTheme = window.localStorage.getItem("app-theme");
    if (savedTheme === "light") {
      setTheme("light");
    }
    const savedIcon = window.localStorage.getItem("profile-icon");
    if (savedIcon) {
      setProfileIconRaw(savedIcon);
    }
  }, []);

  // Update document theme on change
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("app-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  const setProfileIcon = (icon: string) => {
    setProfileIconRaw(icon);
    window.localStorage.setItem("profile-icon", icon);
  };

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

      // Pomodoro sessions
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
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Tasks handlers
  const resetForm = () => {
    setDraft(blankDraft());
    setEditingId(null);
  };

  const saveTodo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const title = draft.title.trim();
    const description = draft.description?.trim();
    if (!title) return;
    try {
      if (editingId) {
        const current = todos.find(t => t.id === editingId);
        await updateTodo(userId, editingId, {
          title,
          description,
          dueDate: draft.dueDate,
          weeklyGoalId: draft.weeklyGoalId,
          completedAt: current?.completed ? (current.completedAt ?? Date.now()) : undefined,
        });
        if (draft.weeklyGoalId) await recalcGoalCompletion(userId, draft.weeklyGoalId);
      } else {
        await addTodo(userId, {
          id: crypto.randomUUID(),
          title,
          description,
          createdAt: Date.now(),
          dueDate: draft.dueDate || startOfToday(),
          completedAt: undefined,
          completed: false,
          weeklyGoalId: draft.weeklyGoalId,
        });
        if (draft.weeklyGoalId) await recalcGoalCompletion(userId, draft.weeklyGoalId);
      }
      resetForm();
      await fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save task");
    }
  };

  const editTodo = (todo: Todo) => {
    setEditingId(todo.id);
    setDraft({
      title: todo.title,
      description: todo.description ?? "",
      dueDate: todo.dueDate,
      weeklyGoalId: todo.weeklyGoalId,
    });
  };

  const moveTodo = async (id: string, completed: boolean) => {
    try {
      const todo = todos.find(t => t.id === id);
      await updateTodo(userId, id, {
        completed,
        completedAt: completed ? Date.now() : undefined,
      });
      if (todo?.weeklyGoalId) await recalcGoalCompletion(userId, todo.weeklyGoalId);
      await fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update task status");
    }
  };

  const removeTodo = async (id: string) => {
    try {
      const todo = todos.find(t => t.id === id);
      await deleteTodo(userId, id);
      if (todo?.weeklyGoalId) await recalcGoalCompletion(userId, todo.weeklyGoalId);
      await fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete task");
    }
  };

  // Goals handlers
  const resetGoalForm = () => {
    setGoalDraft(blankGoalDraft());
    setEditingGoalId(null);
    setShowGoalForm(false);
  };

  const saveGoal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const title = goalDraft.title.trim();
    if (!title) return;
    try {
      if (editingGoalId) {
        await updateWeeklyGoal(userId, editingGoalId, {
          title,
          description: goalDraft.description?.trim(),
          startDate: goalDraft.startDate,
          endDate: goalDraft.endDate,
          totalHours: goalDraft.totalHours,
          status: goalDraft.status,
          review: goalDraft.review?.trim(),
        });
      } else {
        const now = Date.now();
        await addWeeklyGoal(userId, {
          id: crypto.randomUUID(),
          title,
          description: goalDraft.description?.trim(),
          startDate: goalDraft.startDate,
          endDate: goalDraft.endDate,
          totalHours: goalDraft.totalHours,
          status: goalDraft.status,
          completionPercentage: 0,
          review: goalDraft.review?.trim(),
          createdAt: now,
          updatedAt: now,
        });
      }
      resetGoalForm();
      await fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save goal");
    }
  };

  const editGoal = (goal: WeeklyGoal) => {
    setEditingGoalId(goal.id);
    setGoalDraft({
      title: goal.title,
      description: goal.description ?? "",
      startDate: goal.startDate,
      endDate: goal.endDate,
      totalHours: goal.totalHours,
      status: goal.status,
      review: goal.review ?? "",
    });
    setShowGoalForm(true);
  };

  const removeGoal = async (id: string) => {
    try {
      await deleteWeeklyGoal(userId, id);
      await fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete goal");
    }
  };

  return (
    <DashboardContext.Provider
      value={{
        userId,
        userEmail,
        userName,
        theme,
        setTheme,
        toggleTheme,
        profileIcon,
        setProfileIcon,
        todos,
        setTodos,
        historyTodos,
        goals,
        pomodoroSessions,
        goalWorkedMinutes,
        loading,
        error,
        setError,
        fetchAll,
        
        // Tasks
        draft,
        setDraft,
        editingId,
        setEditingId,
        dropTarget,
        setDropTarget,
        saveTodo,
        editTodo,
        moveTodo,
        removeTodo,
        resetForm,
        
        // Goals
        goalDraft,
        setGoalDraft,
        editingGoalId,
        setEditingGoalId,
        showGoalForm,
        setShowGoalForm,
        saveGoal,
        editGoal,
        removeGoal,
        resetGoalForm,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
