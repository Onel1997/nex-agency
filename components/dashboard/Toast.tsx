"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
}

export function Toast({ message, onDismiss, durationMs = 4000 }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss, durationMs]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200 shadow-lg ring-1 ring-emerald-500/25"
    >
      {message}
    </div>
  );
}
