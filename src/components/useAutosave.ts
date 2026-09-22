"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Answers } from "@/lib/questions";

export interface AutosaveInput {
  sessionId: string;
  answers: Answers;
  step: number;
  ref: string | null;
  startedAt: number;
}

const DEBOUNCE_MS = 800;

/**
 * Saves the draft to /api/save on every change: debounced while the user is typing,
 * immediately when the section changes, and flushed (via sendBeacon) when the tab is
 * hidden or closed so drop-offs still reach the database.
 */
export function useAutosave(input: AutosaveInput | null) {
  const inputRef = useRef(input);
  useEffect(() => {
    inputRef.current = input;
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKeyRef = useRef("");
  const stoppedRef = useRef(false);
  const prevStepRef = useRef<number | null>(null);

  const send = useCallback((beacon: boolean) => {
    const cur = inputRef.current;
    if (!cur || stoppedRef.current) return;
    if (Object.keys(cur.answers).length === 0) return; // nothing entered yet
    const key = JSON.stringify({ a: cur.answers, s: cur.step });
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    const body = JSON.stringify({
      sessionId: cur.sessionId,
      answers: cur.answers,
      step: cur.step,
      ref: cur.ref,
      durationSeconds: cur.startedAt ? Math.round((Date.now() - cur.startedAt) / 1000) : null,
    });
    if (beacon && typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const ok = navigator.sendBeacon("/api/save", new Blob([body], { type: "application/json" }));
      if (ok) return;
    }
    fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Let the next change retry this state.
      if (lastKeyRef.current === key) lastKeyRef.current = "";
    });
  }, []);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Schedule a save whenever answers or step change.
  const answers = input?.answers;
  const step = input?.step ?? null;
  useEffect(() => {
    if (!input || stoppedRef.current) return;
    clearTimer();
    const stepChanged = prevStepRef.current !== null && prevStepRef.current !== step;
    prevStepRef.current = step;
    if (stepChanged) {
      send(false);
      return;
    }
    timerRef.current = setTimeout(() => send(false), DEBOUNCE_MS);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, step]);

  // Flush when the page is backgrounded or closed.
  useEffect(() => {
    const flush = () => {
      clearTimer();
      send(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [send]);

  /** Pause autosaving (called right before the final submit). */
  const stop = useCallback(() => {
    stoppedRef.current = true;
    clearTimer();
  }, []);
  /** Resume after a failed submit so later edits are still captured. */
  const resume = useCallback(() => {
    stoppedRef.current = false;
  }, []);

  return { stop, resume };
}
