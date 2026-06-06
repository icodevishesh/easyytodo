"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDashboard } from "./dashboard-provider";
import { signOut } from "@/app/actions/auth";
import {
  Panda,
  ClipboardPen,
  History,
  Target,
  BarChart2,
  Timer,
  Cat,
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Clock,
  Hourglass,
  Dog,
  Rabbit,
  Bird,
  Squirrel,
  Fish,
  Turtle,
  Snail,
} from "lucide-react";

const ANIMAL_ICONS: Record<string, React.ComponentType<any>> = {
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

export default function DashboardLayoutUI({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme, userEmail, userName, error, profileIcon } = useDashboard();
  const ActiveProfileIcon = ANIMAL_ICONS[profileIcon] || Cat;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close mobile drawer on route change (adjusted during render to avoid cascading renders)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
  }


  // Check which views are active
  const isTasksActive = pathname === "/" || pathname === "/tasks";
  const isGoalsActive = pathname === "/goals";
  const isPomodoroActive = pathname === "/pomodoro";
  const isTimerActive = pathname === "/timer";
  const isHistoryActive = pathname === "/history";
  const isAnalyticsActive = pathname === "/analytics";
  const isProfileActive = pathname === "/profile";
  const isSettingsActive = pathname === "/settings";

  // Check if we should show the top navigation tabs in the header
  // Tabs are for: Tasks, Goals, Pomodoro
  const showTabs = isTasksActive || isGoalsActive || isPomodoroActive;

  const handleSignOut = async (e: React.FormEvent) => {
    e.preventDefault();
    await signOut();
  };

  return (
    <div className="flex min-h-screen bg-app-bg text-[var(--app-text)]">
      {/* ── Desktop Sidebar (48px) ── */}
      <aside className="fixed bottom-0 top-0 left-0 z-40 hidden w-12 flex-col justify-between border-r border-app-line bg-app-panel py-4 md:flex">
        {/* Top: Home/Logo */}
        <div className="flex flex-col items-center gap-4">
          <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-lg text-app-accent hover:bg-app-soft transition" aria-label="Home">
            <Panda size={22} />
          </Link>
          
          <div className="h-px w-6 bg-app-line" />

          {/* Sidebar Nav Items */}
          <nav className="flex flex-col gap-2">

                        {/* History */}
            <div className="relative group flex justify-center">
              <Link
                href="/tasks"
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                  isHistoryActive
                    ? "bg-app-accent text-black"
                    : "text-zinc-400 hover:bg-app-soft hover:text-white"
                }`}
                aria-label="Tasks"
              >
                <ClipboardPen size={18} />
              </Link>
              <div className="pointer-events-none absolute left-14 top-1/2 z-50 -translate-y-1/2 rounded-md bg-app-panel border border-app-line px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-all duration-200 translate-x-[-8px] group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap">
                Tasks
              </div>
            </div>
            {/* History */}
            <div className="relative group flex justify-center">
              <Link
                href="/history"
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                  isHistoryActive
                    ? "bg-app-accent text-black"
                    : "text-zinc-400 hover:bg-app-soft hover:text-white"
                }`}
                aria-label="History"
              >
                <History size={18} />
              </Link>
              <div className="pointer-events-none absolute left-14 top-1/2 z-50 -translate-y-1/2 rounded-md bg-app-panel border border-app-line px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-all duration-200 translate-x-[-8px] group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap">
                History
              </div>
            </div>

            {/* Analytics */}
            <div className="relative group flex justify-center">
              <Link
                href="/analytics"
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                  isAnalyticsActive
                    ? "bg-app-accent text-black"
                    : "text-zinc-400 hover:bg-app-soft hover:text-white"
                }`}
                aria-label="Analytics"
              >
                <BarChart2 size={18} />
              </Link>
              <div className="pointer-events-none absolute left-14 top-1/2 z-50 -translate-y-1/2 rounded-md bg-app-panel border border-app-line px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-all duration-200 translate-x-[-8px] group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap">
                Analytics
              </div>
            </div>

            {/* Timer */}
            <div className="relative group flex justify-center">
              <Link
                href="/timer"
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                  isTimerActive
                    ? "bg-app-accent text-black"
                    : "text-zinc-400 hover:bg-app-soft hover:text-white"
                }`}
                aria-label="Timer"
              >
                <Hourglass size={18} />
              </Link>
              <div className="pointer-events-none absolute left-14 top-1/2 z-50 -translate-y-1/2 rounded-md bg-app-panel border border-app-line px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-all duration-200 translate-x-[-8px] group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap">
                Timer
              </div>
            </div>
          </nav>
        </div>

        {/* Bottom: Profile, Settings, Theme, Sign Out */}
        <div className="flex flex-col items-center gap-2">
          {/* Theme Toggle */}
          <div className="relative group flex justify-center">
            <button
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 hover:bg-app-soft hover:text-white transition"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="pointer-events-none absolute left-14 top-1/2 z-50 -translate-y-1/2 rounded-md bg-app-panel border border-app-line px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-all duration-200 translate-x-[-8px] group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap">
              {theme === "dark" ? "Day Mode" : "Night Mode"}
            </div>
          </div>

          {/* Profile */}
          <div className="relative group flex justify-center">
            <Link
              href="/profile"
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                isProfileActive
                  ? "bg-app-accent text-black"
                  : "text-zinc-400 hover:bg-app-soft hover:text-white"
              }`}
              aria-label="Profile"
            >
              <ActiveProfileIcon size={18} />
            </Link>
            <div className="pointer-events-none absolute left-14 top-1/2 z-50 -translate-y-1/2 rounded-md bg-app-panel border border-app-line px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-all duration-200 translate-x-[-8px] group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap">
              Profile
            </div>
          </div>

          {/* Settings */}
          <div className="relative group flex justify-center">
            <Link
              href="/settings"
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                isSettingsActive
                  ? "bg-app-accent text-black"
                  : "text-zinc-400 hover:bg-app-soft hover:text-white"
              }`}
              aria-label="Settings"
            >
              <Settings size={18} />
            </Link>
            <div className="pointer-events-none absolute left-14 top-1/2 z-50 -translate-y-1/2 rounded-md bg-app-panel border border-app-line px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-all duration-200 translate-x-[-8px] group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap">
              Settings
            </div>
          </div>

          <div className="h-px w-6 bg-app-line my-1" />

          {/* Sign Out */}
          <div className="relative group flex justify-center">
            <form onSubmit={handleSignOut}>
              <button
                type="submit"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition cursor-pointer"
                aria-label="Sign out"
              >
                <LogOut size={18} />
              </button>
            </form>
            <div className="pointer-events-none absolute left-14 top-1/2 z-50 -translate-y-1/2 rounded-md bg-app-panel border border-app-line px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-all duration-200 translate-x-[-8px] group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap">
              Sign Out
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile Header & Hamburger ── */}
      <header className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-b border-app-line bg-app-panel px-4 md:hidden">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-app-line text-zinc-300 hover:text-white"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <Link href="/" className="flex items-center gap-1.5">
          <Panda size={20} />
          <span className="text-sm font-bold tracking-[0.18em] text-app-accent">easyytodo</span>
        </Link>

        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-app-line text-zinc-300 hover:text-white"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      {/* ── Mobile Sidebar Drawer ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop overlay */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          />

          {/* Sliding drawer content */}
          <aside className="relative flex w-64 max-w-xs flex-col justify-between border-r border-app-line bg-app-panel p-5 transition-transform duration-300">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-5 border-b border-app-line">
                <span className="flex items-center gap-2">
                  <Panda size={24} />
                  <p className="text-lg font-bold tracking-[0.18em] text-app-accent">easyytodo</p>
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md p-1 border border-app-line text-zinc-400 hover:text-white"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Main Navigation Links */}
              <nav className="mt-6 flex flex-col gap-1">
                <Link
                  href="/"
                  className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition ${
                    isTasksActive
                      ? "bg-app-accent text-black"
                      : "text-zinc-300 hover:bg-app-soft hover:text-white"
                  }`}
                >
                  <ClipboardPen size={18} />
                  <span>Tasks</span>
                </Link>

                <Link
                  href="/goals"
                  className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition ${
                    isGoalsActive
                      ? "bg-app-accent text-black"
                      : "text-zinc-300 hover:bg-app-soft hover:text-white"
                  }`}
                >
                  <Target size={18} />
                  <span>Weekly Goals</span>
                </Link>

                <Link
                  href="/pomodoro"
                  className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition ${
                    isPomodoroActive
                      ? "bg-app-accent text-black"
                      : "text-zinc-300 hover:bg-app-soft hover:text-white"
                  }`}
                >
                  <Timer size={18} />
                  <span>Pomodoro Focus</span>
                </Link>

                <Link
                  href="/timer"
                  className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition ${
                    isTimerActive
                      ? "bg-app-accent text-black"
                      : "text-zinc-300 hover:bg-app-soft hover:text-white"
                  }`}
                >
                  <Clock size={18} />
                  <span>Stopwatch & Timer</span>
                </Link>

                <div className="h-px bg-app-line my-3" />

                <Link
                  href="/history"
                  className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition ${
                    isHistoryActive
                      ? "bg-app-accent text-black"
                      : "text-zinc-300 hover:bg-app-soft hover:text-white"
                  }`}
                >
                  <History size={18} />
                  <span>History</span>
                </Link>

                <Link
                  href="/analytics"
                  className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition ${
                    isAnalyticsActive
                      ? "bg-app-accent text-black"
                      : "text-zinc-300 hover:bg-app-soft hover:text-white"
                  }`}
                >
                  <BarChart2 size={18} />
                  <span>Analytics</span>
                </Link>
              </nav>
            </div>

            {/* Drawer Footer Actions (Profile, Settings, Sign Out) */}
            <div className="border-t border-app-line pt-4 flex flex-col gap-2">
              <Link
                href="/profile"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition ${
                  isProfileActive
                    ? "bg-app-accent text-black"
                    : "text-zinc-300 hover:bg-app-soft hover:text-white"
                }`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-app-soft text-zinc-300">
                  <ActiveProfileIcon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-semibold">{userName || "User"}</p>
                  <p className="truncate text-[10px] text-zinc-500">{userEmail}</p>
                </div>
              </Link>

              <Link
                href="/settings"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition ${
                  isSettingsActive
                    ? "bg-app-accent text-black"
                    : "text-zinc-300 hover:bg-app-soft hover:text-white"
                }`}
              >
                <Settings size={18} />
                <span>Settings</span>
              </Link>

              <form onSubmit={handleSignOut} className="w-full">
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                >
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main Layout Body ── */}
      <main className="flex flex-1 flex-col pl-0 md:pl-12 pt-14 md:pt-0">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8">
          
          {/* Header (App Title & Tabs Navigation) */}
          <header className="flex flex-col gap-4 border-b border-app-line pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="hidden md:flex items-center gap-2 mb-4">
                <Panda />
                <p className="text-lg font-bold tracking-[0.18em] text-app-accent">easyytodo</p>
              </span>
              <h1 className="mt-2 text-2xl font-semibold tracking-normal sm:text-3xl lg:text-4xl">
                {isTasksActive && "Today's work, sorted."}
                {isGoalsActive && "Your Weekly Roadmap"}
                {isPomodoroActive && "Focus Session"}
                {isTimerActive && "Study Timer"}
                {isHistoryActive && "Task Archive"}
                {isAnalyticsActive && "Performance Dashboard"}
                {isProfileActive && "Your Space"}
                {isSettingsActive && "Preferences"}
              </h1>
            </div>

            {/* Top Navigation Tabs for Core Views (Tasks, Goals, Pomodoro) */}
            {showTabs && (
              <nav className="flex rounded-md border border-app-line bg-app-panel p-1 gap-0.5 w-fit select-none">
                <Link
                  href="/"
                  className={`tab inline-flex items-center gap-1.5 ${
                    isTasksActive ? "tab-active" : ""
                  }`}
                >
                  <ClipboardPen size={14} />
                  <span>Tasks</span>
                </Link>
                <Link
                  href="/goals"
                  className={`tab inline-flex items-center gap-1.5 ${
                    isGoalsActive ? "tab-active" : ""
                  }`}
                >
                  <Target size={14} />
                  <span>Goals</span>
                </Link>
                <Link
                  href="/pomodoro"
                  className={`tab inline-flex items-center gap-1.5 ${
                    isPomodoroActive ? "tab-active" : ""
                  }`}
                >
                  <Timer size={14} />
                  <span>Pomodoro</span>
                </Link>
              </nav>
            )}
          </header>

          {/* Gracefully display errors */}
          {error && (
            <div className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Nested page view */}
          <div className="flex-1 flex flex-col">{children}</div>
        </div>
      </main>
    </div>
  );
}
