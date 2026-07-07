"use client";

import { useMemo, useState } from "react";

type Prediction = {
  state: string;
  confidence: number;
  reason: string[];
};

type AnalyzeResponse = {
  task_id: string;
  run_id: number | null;
  metrics: Record<string, number>;
  rule_engine: Prediction;
  llm_engine: Prediction;
};

const defaultTrace = `[
  {
    "timestamp":"2026-07-07T15:20:10Z",
    "step":"PLANNING",
    "action":"Break down user request",
    "duration":1.2,
    "status":"success",
    "metadata":{}
  },
  {
    "timestamp":"2026-07-07T15:20:15Z",
    "step":"LLM_CALL",
    "action":"Generate implementation strategy",
    "duration":2.8,
    "status":"success",
    "metadata":{}
  },
  {
    "timestamp":"2026-07-07T15:20:21Z",
    "step":"TOOL_CALL",
    "action":"Invoke code editor tool",
    "duration":3.1,
    "status":"success",
    "metadata":{}
  }
]`;

export default function HomePage() {
  const [taskPrompt, setTaskPrompt] = useState("Build a landing page for a SaaS startup.");
  const [taskGoal, setTaskGoal] = useState("Deliver responsive hero and pricing sections.");
  const [taskId, setTaskId] = useState("task_2026_07_07_001");
  const [traceInput, setTraceInput] = useState(defaultTrace);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [runs, setRuns] = useState<Array<Record<string, string | number>>>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  const metrics = useMemo(() => {
    if (!result) return [];
    const m = result.metrics;
    return [
      { label: "Runtime (s)", value: String(m.runtime_seconds ?? 0) },
      { label: "Tool Calls", value: String(m.tool_calls ?? 0) },
      { label: "Retry Count", value: String(m.retry_count ?? 0) },
      { label: "Avg Latency (s)", value: String(m.avg_latency_seconds ?? 0) },
      { label: "Progress Score", value: String(m.progress_score ?? 0) },
      {
        label: "Confidence Score",
        value: String(
          Math.max(result.rule_engine.confidence, result.llm_engine.confidence).toFixed(2)
        )
      }
    ];
  }, [result]);

  async function loadRuns() {
    const res = await fetch(`${apiBase}/api/runs`);
    if (!res.ok) return;
    const data = await res.json();
    setRuns(data);
  }

  async function handleAnalyze() {
    setError("");
    setLoading(true);
    try {
      const parsedTrace = JSON.parse(traceInput);
      const payload = {
        task_id: taskId,
        user_prompt: taskPrompt,
        current_goal: taskGoal,
        trace: parsedTrace
      };

      const response = await fetch(`${apiBase}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error("Analyze request failed.");
      }
      const data: AnalyzeResponse = await response.json();
      setResult(data);
      await loadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-xl border border-panelBorder bg-panel p-6">
          <h1 className="text-2xl font-semibold">LLMSheriff</h1>
          <p className="mt-2 text-sm text-slate-300">
            Intent-aware monitoring for autonomous AI agents.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-panelBorder bg-panel p-6 space-y-3">
            <h2 className="text-lg font-medium">Task Information</h2>
            <div className="space-y-2 text-sm text-slate-300">
              <input
                className="w-full rounded border border-panelBorder bg-slate-900 p-2 text-slate-100"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                placeholder="Task ID"
              />
              <input
                className="w-full rounded border border-panelBorder bg-slate-900 p-2 text-slate-100"
                value={taskPrompt}
                onChange={(e) => setTaskPrompt(e.target.value)}
                placeholder="User Prompt"
              />
              <input
                className="w-full rounded border border-panelBorder bg-slate-900 p-2 text-slate-100"
                value={taskGoal}
                onChange={(e) => setTaskGoal(e.target.value)}
                placeholder="Current Goal"
              />
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading}
                className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
              >
                {loading ? "Analyzing..." : "Run Intent Analysis"}
              </button>
              {error ? <p className="text-red-400">{error}</p> : null}
            </div>
          </div>

          <div className="rounded-xl border border-panelBorder bg-panel p-6 space-y-3">
            <h2 className="text-lg font-medium">Execution Timeline</h2>
            <textarea
              className="min-h-52 w-full rounded border border-panelBorder bg-slate-900 p-2 font-mono text-xs text-slate-200"
              value={traceInput}
              onChange={(e) => setTraceInput(e.target.value)}
            />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <article
              key={metric.label}
              className="rounded-xl border border-panelBorder bg-panel p-5"
            >
              <p className="text-xs uppercase tracking-wide text-slate-400">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-xl border border-panelBorder bg-panel p-6">
            <h3 className="text-lg font-medium">Rule Engine Prediction</h3>
            <p className="mt-3 text-sm text-slate-300">
              State: {result?.rule_engine.state ?? "N/A"}
            </p>
            <p className="text-sm text-slate-300">
              Confidence: {result ? `${(result.rule_engine.confidence * 100).toFixed(0)}%` : "N/A"}
            </p>
            <p className="mt-3 text-sm text-slate-300">
              Reason: {result?.rule_engine.reason.join(" ") ?? "Run analysis to get reasoning."}
            </p>
          </article>
          <article className="rounded-xl border border-panelBorder bg-panel p-6">
            <h3 className="text-lg font-medium">Nimotron Prediction</h3>
            <p className="mt-3 text-sm text-slate-300">
              State: {result?.llm_engine.state ?? "N/A"}
            </p>
            <p className="text-sm text-slate-300">
              Confidence: {result ? `${(result.llm_engine.confidence * 100).toFixed(0)}%` : "N/A"}
            </p>
            <p className="mt-3 text-sm text-slate-300">
              Reason: {result?.llm_engine.reason.join(" ") ?? "Run analysis to get reasoning."}
            </p>
          </article>
        </section>

        <section className="rounded-xl border border-panelBorder bg-panel p-6">
          <h3 className="text-lg font-medium">Recent Runs</h3>
          <button
            type="button"
            onClick={loadRuns}
            className="mt-3 rounded border border-panelBorder px-3 py-1 text-sm"
          >
            Refresh Runs
          </button>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {runs.map((run) => (
              <li key={String(run.id)}>
                #{String(run.id)} {String(run.task_id)} | rule:{String(run.rule_state)} | llm:
                {String(run.llm_state)} | progress:{String(run.progress_score)}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
