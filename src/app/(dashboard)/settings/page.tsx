"use client";

import React from "react";
import { useDashboard } from "../dashboard-provider";
import { Sun, Moon, Volume2, ShieldCheck, HelpCircle } from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useDashboard();

  return (
    <section className="py-8 grid gap-8 max-w-2xl mx-auto w-full animate-fade-in">
      {/* Theme Selection */}
      <div className="rounded-xl border border-app-line bg-app-panel p-6 shadow-md">
        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          {theme === "dark" ? <Moon size={20} className="text-app-accent" /> : <Sun size={20} className="text-yellow-500" />}
          <span>Theme Preferences</span>
        </h3>
        <p className="text-sm text-zinc-400 mb-4">Choose how easyytodo looks on your device.</p>
        
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setTheme("dark")}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
              theme === "dark"
                ? "border-app-accent bg-app-accent/5 text-app-accent shadow-md shadow-app-accent/5"
                : "border-app-line hover:border-zinc-500 text-zinc-400"
            }`}
          >
            <Moon size={24} className="mb-2" />
            <span className="text-sm font-semibold">Night Mode</span>
          </button>
          
          <button
            onClick={() => setTheme("light")}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
              theme === "light"
                ? "border-app-accent bg-app-accent/5 text-app-accent shadow-md shadow-app-accent/5"
                : "border-app-line hover:border-zinc-500 text-zinc-400"
            }`}
          >
            <Sun size={24} className="mb-2" />
            <span className="text-sm font-semibold">Day Mode</span>
          </button>
        </div>
      </div>

      {/* Focus Timer Info */}
      <div className="rounded-xl border border-app-line bg-app-panel p-6 shadow-md">
        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          <Volume2 size={20} className="text-zinc-400" />
          <span>Focus Timer (Pomodoro) Settings</span>
        </h3>
        <p className="text-sm text-zinc-400 mb-4">Default configurations for your focus sessions.</p>
        
        <dl className="grid gap-3 text-sm border-t border-app-line/20 pt-4">
          <div className="flex justify-between py-1">
            <dt className="text-zinc-400">Focus Duration</dt>
            <dd className="text-white font-medium">25 minutes</dd>
          </div>
          <div className="flex justify-between py-1 border-t border-app-line/10">
            <dt className="text-zinc-400">Short Break Duration</dt>
            <dd className="text-white font-medium">5 minutes</dd>
          </div>
          <div className="flex justify-between py-1 border-t border-app-line/10">
            <dt className="text-zinc-400">Long Break Duration</dt>
            <dd className="text-white font-medium">15 minutes</dd>
          </div>
        </dl>
      </div>

      {/* System Status */}
      <div className="rounded-xl border border-app-line bg-app-panel p-6 shadow-md">
        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          <ShieldCheck size={20} className="text-green-500" />
          <span>System & Account Status</span>
        </h3>
        <p className="text-sm text-zinc-400 mb-4">Verification and active database connection info.</p>

        <dl className="grid gap-3 text-sm border-t border-app-line/20 pt-4">
          <div className="flex justify-between py-1">
            <dt className="text-zinc-400">Database Engine</dt>
            <dd className="text-green-400 font-semibold flex items-center gap-1.5">
              <span>Supabase / Postgres</span>
              <span className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
            </dd>
          </div>
          <div className="flex justify-between py-1 border-t border-app-line/10">
            <dt className="text-zinc-400">Application Version</dt>
            <dd className="text-zinc-300 font-medium">1.0.0</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
