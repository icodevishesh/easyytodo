"use client";

import React, { useMemo } from "react";
import { useDashboard } from "../dashboard-provider";
import dynamic from "next/dynamic";

const PomodoroTimer = dynamic(() => import("@/app/components/PomodoroTimer"), {
  ssr: false,
  loading: () => <p className="empty-state">Loading timer…</p>,
});


export default function PomodoroPage() {
  const { userId, todos, historyTodos, goals } = useDashboard();

  const allTodos = useMemo(() => {
    return [...todos, ...historyTodos];
  }, [todos, historyTodos]);

  return (
    <section className="py-6 animate-fade-in flex-1 flex flex-col justify-center items-center">
      <PomodoroTimer
        userId={userId}
        todos={allTodos}
        goals={goals}
      />
    </section>
  );
}
