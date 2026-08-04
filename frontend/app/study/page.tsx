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
  const [email, setEmail] = useState("");
  const [profession, setProfession] = useState("");
  const [linkedin, setLinkedin] = useState("");
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
  const [profileError, setProfileError] = useState("");

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

  const readableRubric = useMemo(() => {
    if (!rubric) return "";
    return rubric
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .replace(/^\s*[-*]\s+/gm, "• ")
      .replace(/^\s*\|\s?/gm, "")
      .replace(/\s*\|\s*/g, "  ")
      .replace(/^\s*-{3,}\s*$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }, [rubric]);

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
      annotator_email: email.trim(),
      annotator_profession: profession.trim(),
      annotator_linkedin: linkedin.trim(),
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

  function handleStart() {
    setProfileError("");
    if (!name.trim()) {
      setProfileError("Please enter your name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setProfileError("Please enter a valid email.");
      return;
    }
    setPhase("quiz");
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
      <main className="min-h-[calc(100vh-140px)] bg-zinc-100 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Panel className="rounded-2xl border-zinc-200 shadow-sm">
            <p className="text-sm text-zinc-600">Loading annotation study...</p>
          </Panel>
        </div>
      </main>
    );
  }

  if (error && !traces.length) {
    return (
      <main className="min-h-[calc(100vh-140px)] bg-zinc-100 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-4xl">
        <Panel className="rounded-2xl border-zinc-200 shadow-sm">
          <SectionTitle title="Study unavailable" description={error} />
          <Link href="/" className="text-sm text-sky-700 hover:underline">
            Back to LLMSheriff
          </Link>
        </Panel>
        </div>
      </main>
    );
  }

  if (phase === "intro") {
    return (
      <main className="min-h-[calc(100vh-140px)] bg-zinc-100 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link href="/" className="text-sm font-medium text-zinc-500 hover:text-zinc-800">
            ← LLMSheriff
          </Link>
          <span className="rounded-full bg-zinc-200/70 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-600">
            EPFL annotation study
          </span>
        </div>
        <Panel className="rounded-2xl border-zinc-200 p-6 shadow-sm sm:p-8">
          <SectionTitle
            title="Behavioral state labeling"
            description="About 20–30 minutes. 40 short synthetic agent traces. No account required."
          />
          <div className="space-y-5 text-sm leading-6 text-zinc-700">
            <p>
              Choose <strong>one </strong>behavioral state per trace. Judge only from
              visible events — not the agent&apos;s private thoughts. There are no
              gold labels shown to you.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Completed", "Recovering", "Waiting", "Stalled", "Abandoned"].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-700"
                >
                  {label}
                </span>
              ))}
            </div>
            <p className="text-zinc-600">
              Also allowed if needed: Planning, Executing, Failed.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 sm:col-span-1">
                <span className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Full name <span className="text-red-500">*</span>
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
                  placeholder="e.g. A. Sharma"
                  autoComplete="name"
                />
              </label>
              <label className="block space-y-1.5 sm:col-span-1">
                <span className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Email <span className="text-red-500">*</span>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
                  placeholder="you@university.edu"
                  autoComplete="email"
                />
              </label>
              <label className="block space-y-1.5 sm:col-span-1">
                <span className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Profession / role
                </span>
                <input
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
                  placeholder="e.g. PhD student, ML engineer"
                  autoComplete="organization-title"
                />
              </label>
              <label className="block space-y-1.5 sm:col-span-1">
                <span className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  LinkedIn (optional)
                </span>
                <input
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
                  placeholder="https://linkedin.com/in/..."
                  autoComplete="url"
                />
              </label>
            </div>

            {profileError ? <p className="text-sm text-red-600">{profileError}</p> : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                className="order-2 text-left text-sm font-medium text-sky-700 hover:text-sky-800 hover:underline sm:order-1"
                onClick={() => setShowRubric((v) => !v)}
              >
                {showRubric ? "Hide rubric" : "Show full rubric"}
              </button>
              <button
                type="button"
                onClick={handleStart}
                className="order-1 w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 sm:order-2 sm:w-auto"
              >
                Start labeling
              </button>
            </div>
            {showRubric ? (
              <div className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
                {readableRubric || "Rubric unavailable."}
              </div>
            ) : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        </Panel>
        </div>
      </main>
    );
  }

  if (phase === "done") {
    return (
      <main className="min-h-[calc(100vh-140px)] bg-zinc-100 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-4xl">
        <Panel className="rounded-2xl border-zinc-200 shadow-sm">
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
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-140px)] bg-zinc-100 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500">
        <Link href="/" className="font-medium hover:text-zinc-800">
          ← LLMSheriff
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-zinc-200/70 px-3 py-1 text-xs font-medium text-zinc-700">
            {index + 1} / {traces.length}
          </span>
          <span className="rounded-full bg-zinc-200/70 px-3 py-1 text-xs font-medium text-zinc-700">
            {progress}% answered
          </span>
        </div>
      </div>

      <Panel className="rounded-2xl border-zinc-200 p-4 shadow-sm sm:p-6">
        <SectionTitle
          title={current?.trace_id ?? "Trace"}
          description="Pick the single best behavioral state for this whole run."
        />

        <pre className="mb-5 max-h-[460px] overflow-auto whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs leading-5 text-zinc-800">
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
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
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
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
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
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
              value={currentAnswer.notes}
              onChange={(e) => updateAnswer({ notes: e.target.value })}
              placeholder="Why this state?"
            />
          </label>
        </div>

        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

        <div className="sticky bottom-3 z-10 mt-5 flex flex-wrap gap-3 rounded-xl border border-zinc-200 bg-white/95 p-3 backdrop-blur sm:bottom-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={index === 0 || saving}
            className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={saving || !currentAnswer.state}
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-40"
          >
            {saving
              ? "Saving..."
              : index >= traces.length - 1
                ? "Save & finish"
                : "Save & next"}
          </button>
        </div>
      </Panel>
      </div>
    </main>
  );
}
