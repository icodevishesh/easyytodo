"use client";

import React, { useMemo } from "react";
import { useDashboard } from "../dashboard-provider";
import { signOut } from "@/app/actions/auth";
import {
  Cat,
  Panda,
  Dog,
  Rabbit,
  Bird,
  Squirrel,
  Fish,
  Turtle,
  Snail,
  LogOut,
  CheckCircle,
  BarChart,
  Timer,
  ListTodo,
} from "lucide-react";

// Preloaded companion icons map
export const ANIMAL_ICONS: Record<string, React.ComponentType<any>> = {
  cat: Cat,
  panda: Panda,
  dog: Dog,
  rabbit: Rabbit,
  bird: Bird,
  squirrel: Squirrel,
  fish: Fish,
  turtle: Turtle,
  snail: Snail,
};

export default function ProfilePage() {
  const {
    userEmail,
    userName,
    todos,
    historyTodos,
    pomodoroSessions,
    loading,
    profileIcon,
    setProfileIcon,
  } = useDashboard();

  const allTodos = useMemo(() => {
    return [...todos, ...historyTodos];
  }, [todos, historyTodos]);

  const stats = useMemo(() => {
    const total = allTodos.length;
    const completed = allTodos.filter(t => t.completed).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Filter valid work sessions
    const workSessions = pomodoroSessions.filter(s => s.type === "work" && !s.interrupted);
    const focusMins = workSessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
    const focusHours = (focusMins / 60).toFixed(1);

    return {
      total,
      completed,
      completionRate,
      focusSessions: workSessions.length,
      focusHours: parseFloat(focusHours),
    };
  }, [allTodos, pomodoroSessions]);

  const handleSignOut = async (e: React.FormEvent) => {
    e.preventDefault();
    await signOut();
  };

  if (loading) {
    return <p className="empty-state">Loading profile…</p>;
  }

  // Get name initials
  const initials = userName
    ? userName
        .split(" ")
        .map(w => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  // Resolve active avatar icon
  const ActiveIcon = ANIMAL_ICONS[profileIcon] || Cat;

  return (
    <section className="py-8 grid gap-6 max-w-2xl mx-auto w-full animate-fade-in">
      {/* Profile Card */}
      <article className="relative overflow-hidden rounded-2xl border border-app-line bg-app-panel p-6 sm:p-8 shadow-xl">
        {/* Decorative background glow */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-app-accent/10 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-6 relative z-10">
          {/* Avatar with dynamic outline */}
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-app-accent bg-app-soft text-app-accent shadow-inner">
            <ActiveIcon size={44} className="transition-transform duration-300 hover:scale-110" />
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-app-accent text-black font-bold text-xs shadow-md select-none">
              {initials}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold tracking-tight text-white">{userName || "Productive User"}</h2>
            <p className="text-zinc-400 text-sm mt-1">{userEmail}</p>
            <p className="text-xs text-zinc-500 mt-2 font-mono">Member since: June 2026</p>
          </div>

          <form onSubmit={handleSignOut} className="sm:ml-auto shrink-0 w-full sm:w-auto">
            <button
              type="submit"
              className="danger-button w-full sm:w-auto cursor-pointer inline-flex items-center gap-2 justify-center font-medium hover:brightness-110"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </article>

      {/* Choose Companion Icon Panel */}
      <div className="rounded-xl border border-app-line bg-app-panel p-6 shadow-md">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
          <span>Select Your Companion Icon</span>
        </h3>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-9">
          {Object.entries(ANIMAL_ICONS).map(([key, IconComponent]) => {
            const isSelected = profileIcon === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setProfileIcon(key)}
                className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-app-accent bg-app-accent/10 text-app-accent shadow-md shadow-app-accent/5"
                    : "border-app-line hover:border-zinc-500 text-zinc-400"
                }`}
                title={`Select ${key}`}
                aria-label={`Select ${key} icon`}
              >
                <IconComponent size={24} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Statistics Section */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">Your Lifetime Stats</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Total tasks card */}
          <div className="rounded-xl border border-app-line bg-app-panel p-5 flex items-center gap-4 transition duration-200 hover:border-app-accent">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-app-soft text-app-accent">
              <ListTodo size={24} />
            </div>
            <div>
              <p className="text-xs text-zinc-400">Total Tasks Created</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
            </div>
          </div>

          {/* Completed tasks card */}
          <div className="rounded-xl border border-app-line bg-app-panel p-5 flex items-center gap-4 transition duration-200 hover:border-app-accent">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-app-soft text-green-400">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-xs text-zinc-400">Tasks Completed</p>
              <p className="text-2xl font-bold text-white mt-1">
                {stats.completed} <span className="text-xs font-normal text-zinc-500">({stats.completionRate}%)</span>
              </p>
            </div>
          </div>

          {/* Pomodoro sessions completed card */}
          <div className="rounded-xl border border-app-line bg-app-panel p-5 flex items-center gap-4 transition duration-200 hover:border-app-accent">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-app-soft text-blue-400">
              <Timer size={24} />
            </div>
            <div>
              <p className="text-xs text-zinc-400">Focus Sessions Completed</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.focusSessions}</p>
            </div>
          </div>

          {/* Focus hours card */}
          <div className="rounded-xl border border-app-line bg-app-panel p-5 flex items-center gap-4 transition duration-200 hover:border-app-accent">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-app-soft text-orange-400">
              <BarChart size={24} />
            </div>
            <div>
              <p className="text-xs text-zinc-400">Focus Time Logged</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.focusHours}h</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
