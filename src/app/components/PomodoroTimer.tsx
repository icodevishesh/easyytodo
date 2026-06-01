"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Coffee, Zap, Timer } from "lucide-react";
import {
  startPomodoroSession,
  endPomodoroSession,
  getRecentPomodoroSessions,
  getGoalWorkedMinutes,
  type Todo,
  type WeeklyGoal,
  type PomodoroSession,
} from "@/lib/db";

// ── Types ─────────────────────────────────────────────────────

type Mode = "work" | "short_break" | "long_break";

const MODE_LABELS: Record<Mode, string> = {
  work: "Focus",
  short_break: "Short break",
  long_break: "Long break",
};

const MODE_DURATIONS: Record<Mode, number> = {
  work: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
};

const MODE_COLORS: Record<Mode, string> = {
  work: "var(--app-accent)",
  short_break: "#60a5fa",
  long_break: "#a78bfa",
};

const LS_KEY = "pomodoro_state";

// ── Persisted state shape ─────────────────────────────────────
// We store wall-clock timestamps so the timer survives tab switches.

interface PersistedState {
  mode: Mode;
  /** ms timestamp when the current running segment started (null = paused/stopped) */
  runStartedAt: number | null;
  /** seconds already elapsed before the current running segment */
  elapsedBeforeRun: number;
  /** total duration for the current mode in seconds */
  totalDuration: number;
  selectedTodoId: string;
  /** DB session id (null if DB unavailable or break mode) */
  sessionId: string | null;
  pomodorosDone: number;
  soundEnabled: boolean;
}

function defaultState(): PersistedState {
  return {
    mode: "work",
    runStartedAt: null,
    elapsedBeforeRun: 0,
    totalDuration: MODE_DURATIONS.work,
    selectedTodoId: "",
    sessionId: null,
    pomodorosDone: 0,
    soundEnabled: true,
  };
}

function loadState(): PersistedState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

function saveState(s: PersistedState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {}
}

function clearState() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(LS_KEY); } catch {}
}

// ── Compute seconds left from persisted state ─────────────────

function computeSecondsLeft(ps: PersistedState): number {
  let elapsed = ps.elapsedBeforeRun;
  if (ps.runStartedAt !== null) {
    elapsed += (Date.now() - ps.runStartedAt) / 1000;
  }
  return Math.max(0, Math.round(ps.totalDuration - elapsed));
}

// ── Sound helpers (Web Audio API — no external deps) ──────────

function createAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    return new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();
  } catch {
    return null;
  }
}

function playTone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.3
) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gainNode.gain.setValueAtTime(gain, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playStartSound(ctx: AudioContext) {
  playTone(ctx, 523, 0.15, "sine", 0.25);
  setTimeout(() => playTone(ctx, 659, 0.15, "sine", 0.25), 120);
  setTimeout(() => playTone(ctx, 784, 0.25, "sine", 0.3), 240);
}

function playEndSound(ctx: AudioContext) {
  playTone(ctx, 784, 0.2, "sine", 0.3);
  setTimeout(() => playTone(ctx, 659, 0.2, "sine", 0.25), 180);
  setTimeout(() => playTone(ctx, 523, 0.2, "sine", 0.25), 360);
  setTimeout(() => playTone(ctx, 392, 0.4, "sine", 0.2), 540);
}

function playTickSound(ctx: AudioContext) {
  playTone(ctx, 1200, 0.04, "square", 0.05);
}

// ── Helpers ───────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function fmtSeconds(s: number) {
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

function fmtMinutes(m: number) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

// ── Props ─────────────────────────────────────────────────────

interface PomodoroTimerProps {
  userId: string;
  todos: Todo[];
  goals: WeeklyGoal[];
}

// ── Component ─────────────────────────────────────────────────

export default function PomodoroTimer({
  userId,
  todos,
  goals,
}: PomodoroTimerProps) {
  // Persisted state — source of truth for timer
  const [ps, setPsRaw] = useState<PersistedState>(loadState);

  // Derived display state
  const [secondsLeft, setSecondsLeft] = useState(() => computeSecondsLeft(loadState()));

  // DB / UI state (not persisted — refetched on mount)
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [goalMinutes, setGoalMinutes] = useState<Record<string, number>>({});

  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track which second we last played a tick on (wall-clock based)
  const lastTickSecondRef = useRef<number>(-1);

  const isRunning = ps.runStartedAt !== null;

  // Persist whenever ps changes
  const setPs = useCallback((updater: (prev: PersistedState) => PersistedState) => {
    setPsRaw((prev) => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }, []);

  // Lazy-init audio context on first user interaction
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = createAudioCtx();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  // ── DB fetches (graceful — timer works without DB) ────────────

  useEffect(() => {
    getRecentPomodoroSessions(userId)
      .then(setSessions)
      .catch(() => {}); // table may not exist yet
  }, [userId]);

  useEffect(() => {
    if (goals.length === 0) return;
    Promise.all(
      goals.map(async (g) => {
        try {
          const mins = await getGoalWorkedMinutes(userId, g.id);
          return [g.id, mins] as [string, number];
        } catch {
          return [g.id, 0] as [string, number];
        }
      })
    )
      .then((entries) => setGoalMinutes(Object.fromEntries(entries)))
      .catch(() => {});
  }, [userId, goals, sessions]);

  // ── Timer end handler ─────────────────────────────────────────

  const handleTimerEnd = useCallback(
    async (interrupted: boolean, currentPs: PersistedState) => {
      if (currentPs.soundEnabled) {
        const ctx = getAudioCtx();
        if (ctx) playEndSound(ctx);
      }

      // Try to record in DB — silently ignore if table missing
      if (currentPs.sessionId) {
        try {
          await endPomodoroSession(userId, currentPs.sessionId, interrupted);
          const updated = await getRecentPomodoroSessions(userId);
          setSessions(updated);
        } catch {
          // DB not ready yet — timer still works locally
        }
      }

      const newPomodorosDone =
        !interrupted && currentPs.mode === "work"
          ? currentPs.pomodorosDone + 1
          : currentPs.pomodorosDone;

      setPs(() => ({
        ...currentPs,
        runStartedAt: null,
        elapsedBeforeRun: 0,
        sessionId: null,
        pomodorosDone: newPomodorosDone,
      }));
      setSecondsLeft(currentPs.totalDuration);
    },
    [userId, getAudioCtx, setPs]
  );

  // ── Tick loop — wall-clock based ──────────────────────────────

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setPsRaw((currentPs) => {
        if (currentPs.runStartedAt === null) return currentPs;

        const sLeft = computeSecondsLeft(currentPs);
        setSecondsLeft(sLeft);

        // Tick sound every 60 elapsed seconds
        if (currentPs.soundEnabled) {
          const elapsed = Math.floor(
            currentPs.elapsedBeforeRun +
              (Date.now() - currentPs.runStartedAt) / 1000
          );
          const tickSecond = Math.floor(elapsed / 60) * 60;
          if (tickSecond > 0 && tickSecond !== lastTickSecondRef.current) {
            lastTickSecondRef.current = tickSecond;
            const ctx = audioCtxRef.current;
            if (ctx) playTickSound(ctx);
          }
        }

        // Timer finished
        if (sLeft <= 0) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          // Schedule async end outside the state updater
          setTimeout(() => handleTimerEnd(false, currentPs), 0);
          return { ...currentPs, runStartedAt: null };
        }

        return currentPs; // no state change needed — display driven by setSecondsLeft
      });
    }, 500); // 500ms for snappy display without drift

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, handleTimerEnd]);

  // ── Restore display on mount (tab switch recovery) ────────────

  useEffect(() => {
    const restored = loadState();
    const sLeft = computeSecondsLeft(restored);
    setSecondsLeft(sLeft);

    // If timer finished while we were away, end it now
    if (restored.runStartedAt !== null && sLeft <= 0) {
      handleTimerEnd(false, restored);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Actions ───────────────────────────────────────────────────

  const handleStart = async () => {
    if (ps.mode === "work" && !ps.selectedTodoId) return;

    const ctx = getAudioCtx();
    if (ps.soundEnabled && ctx) playStartSound(ctx);

    let sessionId: string | null = ps.sessionId;

    // Only create a DB session for work mode
    if (ps.mode === "work" && ps.selectedTodoId && !sessionId) {
      const todo = todos.find((t) => t.id === ps.selectedTodoId);
      try {
        const session = await startPomodoroSession(
          userId,
          ps.selectedTodoId,
          todo?.weeklyGoalId
        );
        sessionId = session.id;
      } catch {
        // DB not ready — continue without session tracking
        sessionId = null;
      }
    }

    lastTickSecondRef.current = -1;
    setPs((prev) => ({
      ...prev,
      runStartedAt: Date.now(),
      sessionId,
    }));
  };

  const handlePause = () => {
    if (!isRunning) return;
    const now = Date.now();
    setPs((prev) => {
      if (prev.runStartedAt === null) return prev;
      const additionalElapsed = (now - prev.runStartedAt) / 1000;
      return {
        ...prev,
        runStartedAt: null,
        elapsedBeforeRun: prev.elapsedBeforeRun + additionalElapsed,
      };
    });
  };

  const handleReset = async () => {
    if (isRunning) {
      // Capture current ps before clearing
      const snapshot = { ...ps };
      setPs((prev) => ({ ...prev, runStartedAt: null }));
      await handleTimerEnd(true, snapshot);
    } else {
      setPs((prev) => ({
        ...prev,
        runStartedAt: null,
        elapsedBeforeRun: 0,
        sessionId: null,
      }));
    }
    setSecondsLeft(ps.totalDuration);
  };

  const switchMode = async (newMode: Mode) => {
    if (isRunning) {
      const snapshot = { ...ps };
      setPs((prev) => ({ ...prev, runStartedAt: null }));
      await handleTimerEnd(true, snapshot);
    }
    const newDuration = MODE_DURATIONS[newMode];
    setPs((prev) => ({
      ...prev,
      mode: newMode,
      runStartedAt: null,
      elapsedBeforeRun: 0,
      totalDuration: newDuration,
      sessionId: null,
    }));
    setSecondsLeft(newDuration);
  };

  // ── Derived display values ────────────────────────────────────

  const total = ps.totalDuration;
  const progress = (total - secondsLeft) / total;
  const circumference = 2 * Math.PI * 88;
  const strokeDashoffset = circumference * (1 - progress);
  const accentColor = MODE_COLORS[ps.mode];
  const openTodos = todos.filter((t) => !t.completed);
  const activeGoals = goals.filter(
    (g) => g.status !== "achieved" && g.totalHours > 0
  );

  return (
    <section className="py-6 grid gap-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Timer size={20} className="text-app-accent" />
            Pomodoro
          </h2>
          <p className="text-sm text-zinc-400 mt-0.5">
            Stay focused, one session at a time.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const ctx = getAudioCtx(); // unlock audio on interaction
            void ctx;
            setPs((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
          }}
          className="ghost-button text-xs flex items-center gap-1.5"
          title={ps.soundEnabled ? "Mute sounds" : "Enable sounds"}
        >
          {ps.soundEnabled ? "🔔" : "🔕"} Sound
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex rounded-lg border border-app-line bg-app-panel p-1 gap-1">
        {(["work", "short_break", "long_break"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              ps.mode === m
                ? "bg-app-soft text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Timer ring */}
      <div className="flex flex-col items-center gap-6">
        <div
          className="relative flex items-center justify-center"
          style={{ width: 220, height: 220 }}
        >
          <svg
            width="220"
            height="220"
            className="absolute inset-0"
            style={{ transform: "rotate(-90deg)" }}
          >
            <circle
              cx="110"
              cy="110"
              r="88"
              fill="none"
              stroke="var(--app-soft)"
              strokeWidth="10"
            />
            <circle
              cx="110"
              cy="110"
              r="88"
              fill="none"
              stroke={accentColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{
                transition: "stroke-dashoffset 0.6s linear, stroke 0.4s ease",
              }}
            />
          </svg>

          <div className="relative flex flex-col items-center gap-1 select-none">
            <span
              className="text-5xl font-bold tabular-nums tracking-tight"
              style={{ color: accentColor, transition: "color 0.4s ease" }}
            >
              {fmtSeconds(secondsLeft)}
            </span>
            <span className="text-xs text-zinc-400 uppercase tracking-widest">
              {MODE_LABELS[ps.mode]}
            </span>
            {ps.pomodorosDone > 0 && (
              <span className="text-xs text-zinc-500 mt-0.5">
                {"🍅".repeat(Math.min(ps.pomodorosDone, 8))}
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="ghost-button p-2.5 rounded-full"
            title="Reset"
          >
            <RotateCcw size={18} />
          </button>

          {!isRunning ? (
            <button
              type="button"
              onClick={handleStart}
              disabled={ps.mode === "work" && !ps.selectedTodoId}
              className="primary-button flex items-center gap-2 px-8 py-3 rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
              style={ps.mode !== "work" ? { background: accentColor } : undefined}
            >
              <Play size={18} fill="currentColor" />
              {ps.elapsedBeforeRun > 0 ? "Resume" : "Start"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePause}
              className="secondary-button flex items-center gap-2 px-8 py-3 rounded-full"
            >
              <Pause size={18} fill="currentColor" />
              Pause
            </button>
          )}

          <div
            className="ghost-button p-2.5 rounded-full text-zinc-500 cursor-default select-none"
            title="Mode indicator"
          >
            {ps.mode === "work" ? <Zap size={18} /> : <Coffee size={18} />}
          </div>
        </div>
      </div>

      {/* Todo selector (work mode only) */}
      {ps.mode === "work" && (
        <div className="rounded-lg border border-app-line bg-app-panel p-4">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Working on…
          </label>
          {openTodos.length === 0 ? (
            <p className="text-sm text-zinc-500 italic">
              No open tasks. Create one in Tasks first.
            </p>
          ) : (
            <select
              value={ps.selectedTodoId}
              onChange={(e) =>
                setPs((prev) => ({ ...prev, selectedTodoId: e.target.value }))
              }
              disabled={isRunning}
              className="w-full rounded-md border border-app-line bg-app-soft px-3 py-3 text-white outline-none transition focus:border-app-accent disabled:opacity-50"
            >
              <option value="">— Pick a task —</option>
              {openTodos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                  {(t.pomodoroCount ?? 0) > 0 ? ` 🍅×${t.pomodoroCount}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Weekly goal progress */}
      {activeGoals.length > 0 && (
        <div className="rounded-lg border border-app-line bg-app-panel p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
            <Zap size={14} className="text-app-accent" />
            Weekly focus hours
          </h3>
          <div className="flex flex-col gap-4">
            {activeGoals.map((goal) => {
              const workedMins = goalMinutes[goal.id] ?? 0;
              const targetMins = goal.totalHours * 60;
              const pct =
                targetMins > 0
                  ? Math.min(100, Math.round((workedMins / targetMins) * 100))
                  : 0;
              return (
                <div key={goal.id}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-zinc-300 truncate max-w-[60%]">
                      {goal.title}
                    </span>
                    <span className="text-zinc-400 shrink-0">
                      {fmtMinutes(workedMins)} / {goal.totalHours}h
                      <span className="ml-1.5 text-app-accent font-semibold">
                        {pct}%
                      </span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-app-soft">
                    <div
                      className="h-full rounded-full bg-app-accent transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <div className="rounded-lg border border-app-line bg-app-panel p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">
            Recent sessions
          </h3>
          <div className="flex flex-col gap-2 max-h-52 overflow-y-auto no-scrollbar">
            {sessions.slice(0, 10).map((s) => {
              const todo = todos.find((t) => t.id === s.todoId);
              const goal = goals.find((g) => g.id === s.weeklyGoalId);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-md bg-app-soft px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate text-zinc-200 font-medium">
                      {todo?.title ?? "Unknown task"}
                    </p>
                    {goal && (
                      <p className="truncate text-zinc-500 mt-0.5">
                        {goal.title}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-app-accent font-semibold">
                      {fmtMinutes(s.durationMinutes ?? 0)}
                    </p>
                    {s.interrupted && (
                      <p className="text-zinc-500">interrupted</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
