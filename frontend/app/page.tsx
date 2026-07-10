"use client";

import { useEffect, useMemo, useState } from "react";
import { BehaviorGraph } from "@/components/BehaviorGraph";
import { BehaviorScore } from "@/components/BehaviorScore";
import { DisagreementPanel } from "@/components/DisagreementPanel";
import { EvidencePanel } from "@/components/EvidencePanel";
import { IntentTimeline } from "@/components/IntentTimeline";
import { InterventionRecommendation } from "@/components/InterventionRecommendation";
import { LimitationsPanel } from "@/components/LimitationsPanel";
import { LiveExecutionDemo } from "@/components/LiveExecutionDemo";
import { MetricsGrid } from "@/components/MetricsGrid";
import { PredictionCards } from "@/components/PredictionCards";
import { ResearchContribution } from "@/components/ResearchContribution";
import { RunsList } from "@/components/RunsList";
import { ScenarioBar } from "@/components/ScenarioBar";
import { TaskPanel } from "@/components/TaskPanel";
import { TimelineChart } from "@/components/TimelineChart";
import { analyzeIntent, fetchRecentRuns } from "@/lib/api";
import { Scenario } from "@/lib/scenarios";
import { AnalyzeResponse, RecentRun } from "@/types/intent";

const defaultTrace = `[
  {
    "timestamp":"2026-07-08T15:20:10Z",
    "step":"PLANNING",
    "action":"Break down user request",
    "duration":1.2,
    "status":"success",
    "metadata":{}
  },
  {
    "timestamp":"2026-07-08T15:20:15Z",
    "step":"LLM_CALL",
    "action":"Generate implementation strategy",
    "duration":2.8,
    "status":"success",
    "metadata":{}
  },
  {
    "timestamp":"2026-07-08T15:20:21Z",
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
  const [runs, setRuns] = useState<RecentRun[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const metrics = useMemo(() => {
    if (!result) return [];
    const m = result.metrics;
    const progressPct = Math.min(100, Math.round((m.progress_score ?? 0) * 100));
    return [
      { label: "Runtime (s)", value: String(m.runtime_seconds ?? 0) },
      { label: "LLM Calls", value: String(m.llm_calls ?? 0) },
      { label: "Tool Calls", value: String(m.tool_calls ?? 0) },
      { label: "Retry Count", value: String(m.retry_count ?? 0) },
      { label: "Failed Steps", value: String(m.failed_steps ?? 0) },
      { label: "Goal Progress", value: `${progressPct}%` }
    ];
  }, [result]);

  async function loadRuns() {
    try {
      const data = await fetchRecentRuns();
      setRuns(data);
    } catch {
      // Keep current data if refresh fails.
    }
  }

  useEffect(() => {
    void loadRuns();
  }, []);

  const tracePreview = useMemo(() => {
    try {
      const parsed = JSON.parse(traceInput) as Array<{
        timestamp?: string;
        duration?: number;
        step?: string;
        action?: string;
        status?: string;
      }>;
      return parsed
        .filter((item) => typeof item.duration === "number")
        .map((item) => ({
          timestamp: item.timestamp ?? "",
          duration: Number(item.duration ?? 0),
          step: item.step ?? "UNKNOWN",
          action: item.action ?? "",
          status: item.status ?? "success"
        }));
    } catch {
      return [];
    }
  }, [traceInput]);

  function handleScenarioLoad(scenario: Scenario) {
    setTaskPrompt(scenario.taskPrompt);
    setTaskGoal(scenario.taskGoal);
    setTaskId(scenario.taskId);
    setTraceInput(JSON.stringify(scenario.trace, null, 2));
    setResult(null);
    setError("");
    setStatusMessage(`Loaded scenario: ${scenario.label}. Choose Analyze Trace Now or Replay Trace & Analyze.`);
    setActiveScenario(scenario.label);
  }

  async function handleAnalyze(trigger: "manual" | "simulate" = "manual") {
    setError("");
    setStatusMessage(
      trigger === "manual"
        ? "Running direct analysis..."
        : "Replay finished. Running analysis from replayed trace..."
    );
    setLoading(true);
    try {
      const parsedTrace = JSON.parse(traceInput);
      const payload = {
        task_id: taskId,
        user_prompt: taskPrompt,
        current_goal: taskGoal,
        trace: parsedTrace
      };
      const data = await analyzeIntent(payload);
      setResult(data);
      setStatusMessage(
        trigger === "manual"
          ? "Analysis complete. Results updated below."
          : "Replay + analysis complete. Results updated below."
      );
      await loadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setStatusMessage("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-6 text-zinc-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="border-b border-zinc-200 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">LLMSheriff</h1>
              <p className="mt-1 max-w-2xl text-sm text-zinc-600">
                Research prototype for intent-aware monitoring of autonomous AI agents.
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                By{" "}
                <a
                  href="https://rajendra.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-zinc-700 hover:underline"
                >
                  Rajendra Kumar Shaw
                </a>
                {" · "}
                <a
                  href="https://rajendra.dev/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-600 hover:text-zinc-900 hover:underline"
                >
                  Contact
                </a>
              </p>
            </div>
            <a
              href="/paper.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Research Paper (PDF)
            </a>
          </div>
          <p className="mt-3 max-w-3xl text-sm text-zinc-500">
            <span className="font-medium text-zinc-700">Hypothesis:</span> execution traces can
            be interpreted to infer behavioral states — distinguishing a healthy running agent
            from one that has quietly abandoned its goal.
          </p>
        </header>

        <ScenarioBar onLoad={handleScenarioLoad} active={activeScenario} />

        <TaskPanel
          taskId={taskId}
          taskPrompt={taskPrompt}
          taskGoal={taskGoal}
          traceInput={traceInput}
          loading={loading}
          error={error}
          statusMessage={statusMessage}
          onTaskIdChange={setTaskId}
          onTaskPromptChange={setTaskPrompt}
          onTaskGoalChange={setTaskGoal}
          onTraceInputChange={setTraceInput}
          onAnalyze={() => void handleAnalyze("manual")}
        />

        <LiveExecutionDemo
          traceInput={traceInput}
          taskPrompt={taskPrompt}
          onComplete={() => void handleAnalyze("simulate")}
        />

        <InterventionRecommendation result={result} />

        <div className="grid gap-5 md:grid-cols-2">
          <TimelineChart trace={tracePreview} />
          <IntentTimeline trace={tracePreview} result={result} />
        </div>

        <BehaviorGraph trace={tracePreview} result={result} />

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <MetricsGrid metrics={metrics} />
          </div>
          <BehaviorScore result={result} />
        </div>

        <PredictionCards result={result} />
        <DisagreementPanel result={result} />
        <EvidencePanel result={result} />

        <div className="grid gap-5 md:grid-cols-2">
          <ResearchContribution />
          <LimitationsPanel />
        </div>

        <RunsList runs={runs} onRefresh={loadRuns} />
      </div>
    </main>
  );
}
