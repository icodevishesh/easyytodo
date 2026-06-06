"use client";

import React, { useState, useEffect, useRef } from "react";
import { useDashboard } from "../dashboard-provider";
import { RotateCcw, Clock, Play, Pause, ListPlus, Volume2, VolumeX } from "lucide-react";

type Mode = "stopwatch" | "countdown";

export default function TimerPage() {
  const { theme } = useDashboard();
  const [mode, setMode] = useState<Mode>("stopwatch");
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0); // in ms
  const [laps, setLaps] = useState<number[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Countdown specific states
  const [presetMinutes, setPresetMinutes] = useState(5);
  const [countdownStartVal, setCountdownStartVal] = useState(5 * 60000); // 5 mins in ms

  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const previousTimeRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sound helper for timer completion
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 880; // A5 note
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.warn("Audio Context failed to initialize:", e);
    }
  };

  // Format time in ms to MM:SS.d
  const formatTime = (ms: number) => {
    const isNegative = ms < 0;
    const absMs = Math.abs(ms);
    const minutes = Math.floor(absMs / 60000);
    const seconds = Math.floor((absMs % 60000) / 1000);
    const tenths = Math.floor((absMs % 1000) / 100);
    return `${isNegative ? "-" : ""}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
  };

  const updateTimer = (timestamp: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
    }
    const elapsed = timestamp - startTimeRef.current;
    let newTime = 0;

    if (mode === "stopwatch") {
      newTime = previousTimeRef.current + elapsed;
      setTime(newTime);
    } else {
      newTime = previousTimeRef.current - elapsed;
      if (newTime <= 0) {
        setTime(0);
        setIsRunning(false);
        playBeep();
        if (requestRef.current) {
          cancelAnimationFrame(requestRef.current);
          requestRef.current = null;
        }
        return;
      }
      setTime(newTime);
    }

    requestRef.current = requestAnimationFrame(updateTimer);
  };

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = 0;
      requestRef.current = requestAnimationFrame(updateTimer);
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isRunning, mode]);

  const handleStartPause = () => {
    if (isRunning) {
      // Pause
      previousTimeRef.current = time;
    } else {
      // Start
      if (mode === "countdown" && time === 0) {
        // Reset countdown to preset if it finished
        setTime(countdownStartVal);
        previousTimeRef.current = countdownStartVal;
      } else {
        previousTimeRef.current = time;
      }
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    startTimeRef.current = 0;
    previousTimeRef.current = mode === "stopwatch" ? 0 : countdownStartVal;
    setTime(mode === "stopwatch" ? 0 : countdownStartVal);
    setLaps([]);
  };

  const handleLap = () => {
    if (mode === "stopwatch") {
      setLaps((prev) => [time, ...prev]);
    }
  };

  const toggleMode = () => {
    setIsRunning(false);
    setLaps([]);
    const nextMode = mode === "stopwatch" ? "countdown" : "stopwatch";
    setMode(nextMode);
    setTime(nextMode === "stopwatch" ? 0 : countdownStartVal);
    previousTimeRef.current = nextMode === "stopwatch" ? 0 : countdownStartVal;
  };

  const handlePresetChange = (mins: number) => {
    if (isRunning) return;
    const msVal = mins * 60000;
    setPresetMinutes(mins);
    setCountdownStartVal(msVal);
    setTime(msVal);
    previousTimeRef.current = msVal;
  };

  // Get current lap time
  const currentLapTime = laps.length === 0 ? time : time - laps[0];

  return (
    <section className="relative flex flex-1 flex-col items-center justify-center min-h-[500px] rounded-2xl overflow-hidden">
      {/* Cozy Cafe background image */}
      {/* <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-500 scale-[1.01]"
        style={{ backgroundImage: "url('/cozy_cafe_bg.png')" }}
      /> */}
      
      {/* Dark overlay backdrop */}
      {/* <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-colors" /> */}

      {/* Timer Display Console */}
      <div className="relative z-10 flex flex-col items-center gap-2 text-center text-white w-full max-w-lg px-6">
        
        {/* Giant Timer digits */}
        <h2 className="font-mono text-7xl sm:text-8xl md:text-9xl font-bold tracking-tight select-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          {formatTime(time)}
        </h2>

        {/* Sub-label showing lap status / current lap */}
        <div className="text-zinc-300 font-semibold tracking-wide text-sm md:text-base h-6">
          {mode === "stopwatch" ? (
            <span>Current: {formatTime(currentLapTime)}</span>
          ) : (
            <span>Countdown Mode</span>
          )}
        </div>

        {/* Control Button Actions */}
        <div className="flex items-center gap-4 mt-8 flex-wrap justify-center">
          {/* Start/Pause filled button */}
          <button
            onClick={handleStartPause}
            className="flex h-12 min-w-28 items-center justify-center gap-2 rounded-full bg-app-accent px-6 text-sm font-semibold text-black shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer"
            aria-label={isRunning ? "Pause" : "Start"}
          >
            {isRunning ? (
              <>
                <Pause size={16} fill="black" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={16} fill="black" />
                <span>Start</span>
              </>
            )}
          </button>

          {/* Lap (Stopwatch) / Preset (Countdown) border button */}
          {mode === "stopwatch" ? (
            <button
              onClick={handleLap}
              disabled={!isRunning}
              className="flex h-12 items-center justify-center gap-1.5 rounded-full border border-white/40 bg-black/20 hover:bg-white/10 px-6 text-sm font-semibold text-white transition disabled:opacity-40 disabled:pointer-events-none active:scale-95 cursor-pointer"
            >
              <ListPlus size={16} />
              <span>Lap</span>
            </button>
          ) : (
            <div className="flex items-center rounded-full border border-white/40 bg-black/20 px-2 h-12">
              {[1, 5, 10, 25].map((mins) => (
                <button
                  key={mins}
                  onClick={() => handlePresetChange(mins)}
                  disabled={isRunning}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition disabled:opacity-50 ${
                    presetMinutes === mins
                      ? "bg-app-accent text-black"
                      : "text-zinc-300 hover:text-white"
                  } cursor-pointer`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          )}

          {/* Reload / Reset Circle Button */}
          <button
            onClick={handleReset}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-black/20 text-white hover:bg-white/10 active:rotate-45 transition duration-300 cursor-pointer"
            title="Reset timer"
            aria-label="Reset timer"
          >
            <RotateCcw size={18} />
          </button>

          {/* Mode toggle button */}
          <button
            onClick={toggleMode}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-black/20 text-white hover:bg-white/10 transition cursor-pointer"
            title={mode === "stopwatch" ? "Switch to Countdown" : "Switch to Stopwatch"}
            aria-label="Switch mode"
          >
            <Clock size={18} />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-black/20 text-white hover:bg-white/10 transition cursor-pointer"
            title={soundEnabled ? "Mute beep sound" : "Enable beep sound"}
            aria-label="Toggle beep sound"
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>

        {/* Laps List Panel (Stopwatch mode only) */}
        {mode === "stopwatch" && laps.length > 0 && (
          <div className="mt-8 w-full max-h-40 overflow-y-auto border border-white/10 bg-black/30 rounded-xl p-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <h4 className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-2 text-left">Laps Log</h4>
            <div className="flex flex-col gap-1.5 text-sm">
              {laps.map((lapTime, idx) => {
                const lapNumber = laps.length - idx;
                const prevLap = laps[idx + 1] ?? 0;
                const splitTime = lapTime - prevLap;
                return (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-white/5 last:border-b-0">
                    <span className="text-zinc-400 font-medium">Lap {lapNumber}</span>
                    <span className="font-mono text-zinc-300">Split: {formatTime(splitTime)}</span>
                    <span className="font-mono font-semibold text-app-accent">{formatTime(lapTime)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
