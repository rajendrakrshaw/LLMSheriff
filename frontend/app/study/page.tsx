"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  fetchStudyRubric,
  fetchStudyTraces,
  submitStudyAnnotations,
  type StudyTrace
} from "@/lib/api";
import { Panel, SectionTitle } from "@/components/ui";

type Answer = {
  state: string;
  confidence: number | null;
  notes: string;
};

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function StudyPage() {
  const [phase, setPhase] = useState<"intro" | "quiz" | "done">("intro");
  const [name, setName] = useState("");
  const [sessionId] = useState(() => createSessionId());
  const [traces, setTraces] = useState<StudyTrace[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [rubric, setRubric] = useState("");
  const [showRubric, setShowRubric] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pack, rubricText] = await Promise.all([
          fetchStudyTraces(),
          fetchStudyRubric()
        ]);
        if (cancelled) return;
        setTraces(pack.traces);
        setStates(pack.states);
        setRubric(rubricText);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load study");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const current = traces[index];
  const currentAnswer = current
    ? answers[current.trace_id] ?? { state: "", confidence: null, notes: "" }
    : { state: "", confidence: null, notes: "" };

  const progress = useMemo(() => {
    if (!traces.length) return 0;
    return Math.round((Object.keys(answers).length / traces.length) * 100);
  }, [answers, traces.length]);

  function updateAnswer(patch: Partial<Answer>) {
    if (!current) return;
    setAnswers((prev) => ({
      ...prev,
      [current.trace_id]: {
        ...currentAnswer,
        ...patch
      }
    }));
  }

  async function persistCurrent(nextAnswers: Record<string, Answer>) {
    if (!current || !nextAnswers[current.trace_id]?.state) return;
    const a = nextAnswers[current.trace_id];
    await submitStudyAnnotations({
      session_id: sessionId,
      annotator_name: name.trim() || "anonymous",
      annotations: [
        {
          trace_id: current.trace_id,
          state: a.state,
          confidence: a.confidence,
          notes: a.notes
        }
      ]
    });
  }

  async function handleNext() {
    if (!current || !currentAnswer.state) {
      setError("Please choose a state before continuing.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const nextAnswers = {
        ...answers,
        [current.trace_id]: currentAnswer
      };
      setAnswers(nextAnswers);
      await persistCurrent(nextAnswers);
      if (index >= traces.length - 1) {
        setPhase("done");
      } else {
        setIndex((i) => i + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleBack() {
    if (index === 0) return;
    setIndex((i) => i - 1);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-zinc-600">Loading annotation study…</p>
      </main>
    );
  }

  if (error && !traces.length) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Panel>
          <SectionTitle title="Study unavailable" description={error} />
          <Link href="/" className="text-sm text-sky-700 hover:underline">
            Back to LLMSheriff
          </Link>
        </Panel>
      </main>
    );
  }

  if (phase === "intro") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
            ← LLMSheriff
          </Link>
          <span className="text-xs text-zinc-400">EPFL annotation study</span>
        </div>
        <Panel>
          <SectionTitle
            title="Behavioral state labeling"
            description="About 20–30 minutes. 40 short synthetic agent traces. No account required."
          />
          <div className="space-y-4 text-sm leading-6 text-zinc-700">
            <p>
              Choose <strong>one</strong> behavioral state per trace. Judge only from
              visible events — not the agent&apos;s private thoughts. There are no
              gold labels shown to you.
            </p>
            <p>
              Primary labels: Completed, Recovering, Waiting, Stalled, Abandoned.
              Also allowed if needed: Planning, Executing, Failed.
            </p>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Your name or initials (optional)
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2"
                placeholder="e.g. A. Sharma"
              />
            </label>
            <button
              type="button"
              className="text-sm text-sky-700 hover:underline"
              onClick={() => setShowRubric((v) => !v)}
            >
              {showRubric ? "Hide rubric" : "Show full rubric"}
            </button>
            {showRubric ? (
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-xs text-zinc-700">
                {rubric || "Rubric unavailable."}
              </pre>
            ) : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="button"
              onClick={() => setPhase("quiz")}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Start labeling
            </button>
          </div>
        </Panel>
      </main>
    );
  }

  if (phase === "done") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Panel>
          <SectionTitle
            title="Thank you"
            description={`Saved labels for this session (${sessionId.slice(0, 8)}…). Your help strengthens the EPFL paper evaluation.`}
          />
          <p className="mb-4 text-sm text-zinc-600">
            You can close this tab. If anything failed partway, refresh and continue — answers
            are saved per trace.
          </p>
          <Link href="/" className="text-sm text-sky-700 hover:underline">
            Back to LLMSheriff
          </Link>
        </Panel>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-800">
          ← LLMSheriff
        </Link>
        <span>
          {index + 1} / {traces.length} · {progress}% answered
        </span>
      </div>

      <Panel>
        <SectionTitle
          title={current?.trace_id ?? "Trace"}
          description="Pick the single best behavioral state for this whole run."
        />

        <pre className="mb-5 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-md border border-zinc-200 bg-zinc-50 p-4 text-xs leading-5 text-zinc-800">
          {current?.text}
        </pre>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {states.map((state) => {
            const active = currentAnswer.state === state;
            return (
              <button
                key={state}
                type="button"
                onClick={() => updateAnswer({ state })}
                className={`rounded-md border px-3 py-2 text-sm ${
                  active
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500"
                }`}
              >
                {state}
              </button>
            );
          })}
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Confidence (optional)
            </span>
            <select
              className="w-full rounded-md border border-zinc-300 px-3 py-2"
              value={currentAnswer.confidence ?? ""}
              onChange={(e) =>
                updateAnswer({
                  confidence: e.target.value ? Number(e.target.value) : null
                })
              }
            >
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-1">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Notes (optional)
            </span>
            <input
              className="w-full rounded-md border border-zinc-300 px-3 py-2"
              value={currentAnswer.notes}
              onChange={(e) => updateAnswer({ notes: e.target.value })}
              placeholder="Why this state?"
            />
          </label>
        </div>

        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={index === 0 || saving}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={saving || !currentAnswer.state}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
          >
            {saving
              ? "Saving…"
              : index >= traces.length - 1
                ? "Save & finish"
                : "Save & next"}
          </button>
        </div>
      </Panel>
    </main>
  );
}
