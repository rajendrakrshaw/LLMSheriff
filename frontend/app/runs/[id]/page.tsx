"use client";

import { TimelineChart } from "@/components/TimelineChart";
import { Panel } from "@/components/layout";
import { fetchRunDetail } from "@/lib/api";
import { RunDetail } from "@/types/intent";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function RunDetailPage() {
  const params = useParams<{ id: string }>();
  const [run, setRun] = useState<RunDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const runId = Number(params.id);
        const data = await fetchRunDetail(runId);
        setRun(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load run.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.id]);

  const trace = useMemo(() => {
    if (!run) return [];
    return run.events.map((event) => ({
      timestamp: event.timestamp,
      duration: event.duration,
      step: event.step
    }));
  }, [run]);

  return (
    <main className="min-h-screen bg-zinc-100 p-6 text-zinc-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="border-b border-zinc-200 pb-4">
          <Link
            className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900"
            href="/"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="mt-3 text-xl font-semibold">Run details</h1>
        </header>

        {loading ? <p className="text-sm text-zinc-500">Loading…</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {run ? (
          <>
            <Panel>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="text-zinc-500">Run ID</dt><dd>{run.id}</dd></div>
                <div><dt className="text-zinc-500">Task ID</dt><dd>{run.task_id}</dd></div>
                <div className="sm:col-span-2"><dt className="text-zinc-500">Prompt</dt><dd>{run.user_prompt}</dd></div>
                <div className="sm:col-span-2"><dt className="text-zinc-500">Goal</dt><dd>{run.current_goal}</dd></div>
                <div><dt className="text-zinc-500">Rule state</dt><dd>{run.rule_state} ({(run.rule_confidence * 100).toFixed(0)}%)</dd></div>
                <div><dt className="text-zinc-500">LLM state</dt><dd>{run.llm_state} ({(run.llm_confidence * 100).toFixed(0)}%)</dd></div>
                <div><dt className="text-zinc-500">Progress</dt><dd>{run.progress_score}</dd></div>
                <div><dt className="text-zinc-500">Runtime</dt><dd>{run.runtime_seconds}s</dd></div>
              </dl>
            </Panel>

            <TimelineChart trace={trace} />

            <Panel>
              <h2 className="mb-4 text-base font-semibold">Event log</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-200 text-zinc-500">
                    <tr>
                      <th className="pb-2 pr-4 font-medium">Time</th>
                      <th className="pb-2 pr-4 font-medium">Step</th>
                      <th className="pb-2 pr-4 font-medium">Action</th>
                      <th className="pb-2 pr-4 font-medium">Duration</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {run.events.map((event) => (
                      <tr key={event.id}>
                        <td className="py-2 pr-4 text-zinc-600">{event.timestamp}</td>
                        <td className="py-2 pr-4">{event.step}</td>
                        <td className="py-2 pr-4">{event.action}</td>
                        <td className="py-2 pr-4">{event.duration}s</td>
                        <td className="py-2">{event.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        ) : null}
      </div>
    </main>
  );
}
