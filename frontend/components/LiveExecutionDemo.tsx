"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Play, Square } from "lucide-react";
import { TraceEventInput } from "@/types/intent";
import { Panel, SectionTitle } from "@/components/ui";

type LiveExecutionDemoProps = {
  traceInput: string;
  taskPrompt: string;
  onComplete: () => void;
};

type LiveEvent = TraceEventInput & { index: number };

function inferStepLabel(event: LiveEvent, recent: LiveEvent[]): string {
  const step = event.step.toUpperCase();
  const action = event.action.toLowerCase();
  const hadRecentFailure = recent.some((e) => e.status === "failed");
  const usingAlternative =
    hadRecentFailure &&
    event.status === "success" &&
    (action.includes("fallback") ||
      action.includes("alternate") ||
      action.includes("alternative") ||
      action.includes("public api"));

  if (usingAlternative) return "Recovering";
  if (step.includes("PLAN")) return "Planning";
  if (action.includes("search")) return "Searching";
  if (action.includes("poll") || action.includes("wait")) return "Waiting";
  if (action.includes("retry") || event.status === "failed") return "Retrying";
  if (step.includes("LLM")) return "Reasoning";
  if (step.includes("TOOL")) return "Calling tool";
  return "Executing";
}

function detectLoop(events: LiveEvent[]): boolean {
  if (events.length < 3) return false;
  const last = events.slice(-3);
  return last.every((e) => e.action === last[0].action);
}

export function LiveExecutionDemo({ traceInput, taskPrompt, onComplete }: LiveExecutionDemoProps) {
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [currentLabel, setCurrentLabel] = useState<string | null>(null);
  const [loopDetected, setLoopDetected] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function stop() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setRunning(false);
  }

  function start() {
    let parsed: TraceEventInput[];
    try {
      parsed = JSON.parse(traceInput) as TraceEventInput[];
    } catch {
      return;
    }
    if (parsed.length === 0) return;

    stop();
    setEvents([]);
    setLoopDetected(false);
    setCurrentLabel("Planning");
    setRunning(true);

    let index = 0;
    const tick = () => {
      if (index >= parsed.length) {
        setRunning(false);
        setCurrentLabel("Analysis ready");
        onComplete();
        return;
      }

      const next: LiveEvent = { ...parsed[index], index };
      const revealed = parsed.slice(0, index + 1).map((e, i) => ({ ...e, index: i }));
      const label = inferStepLabel(next, revealed);
      const looping = detectLoop(revealed);

      setEvents(revealed);
      setCurrentLabel(label);
      setLoopDetected(looping);
      index += 1;
      timerRef.current = setTimeout(tick, 1200);
    };

    timerRef.current = setTimeout(tick, 800);
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle
          title="Live execution demo"
          description="Replay the trace step by step."
        />
        <div className="flex gap-2">
          {running ? (
            <button
              type="button"
              onClick={stop}
              className="inline-flex items-center gap-1.5 rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <Square className="h-3.5 w-3.5" /> Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={start}
              className="inline-flex items-center gap-1.5 rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800"
            >
              <Play className="h-3.5 w-3.5" /> Simulate
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-xs text-zinc-500">Task</p>
        <p className="mt-1 text-sm text-zinc-800">{taskPrompt || "No task prompt set"}</p>

        {running || events.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs text-zinc-500">Current intent</p>
            <p className="mt-1 text-base font-medium text-zinc-900">
              {currentLabel ?? "—"}
              {running && <span className="text-zinc-400"> …</span>}
            </p>
            {loopDetected && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                Possible loop detected.
              </p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">Press simulate to replay the trace.</p>
        )}
      </div>

      {events.length > 0 && (
        <div className="mt-4 divide-y divide-zinc-200 rounded border border-zinc-200">
          {events.map((event) => (
            <div key={event.index} className="flex items-center gap-3 px-3 py-2 text-xs">
              <span className="w-16 shrink-0 text-zinc-400">{event.timestamp.slice(11, 19)}</span>
              <span className="w-24 shrink-0 font-medium text-zinc-700">
                {inferStepLabel(event, events.slice(0, event.index + 1))}
              </span>
              <span className="truncate text-zinc-500">{event.action}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
