"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  completeStudy,
  fetchStudyRubric,
  fetchStudyTraces,
  resumeStudyProgress,
  submitStudyAnnotations,
  type StudyTrace
} from "@/lib/api";
import { Panel, SectionTitle } from "@/components/ui";

type Answer = {
  state: string;
  confidence: number | null;
  notes: string;
};

type Phase = "intro" | "quiz" | "done";

type StudyDraft = {
  version: 1;
  sessionId: string;
  phase: Phase;
  name: string;
  email: string;
  profession: string;
  linkedin: string;
  index: number;
  answers: Record<string, Answer>;
};

const STORAGE_KEY = "llmsheriff_study_progress_v1";

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function isValidEmail(value: string): boolean {
  // Practical check: local@domain.tld (rejects "a@", "@b.com", "a@b", spaces)
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function loadDraft(): StudyDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudyDraft;
    if (parsed?.version !== 1 || !parsed.sessionId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveDraft(draft: StudyDraft) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // ignore quota / private mode
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default function StudyPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profession, setProfession] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [ready, setReady] = useState(false);
  const [traces, setTraces] = useState<StudyTrace[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [rubric, setRubric] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [starting, setStarting] = useState(false);
  const [emailNotice, setEmailNotice] = useState("");
  const [resumeNotice, setResumeNotice] = useState("");

  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setSessionId(draft.sessionId);
      setPhase(draft.phase);
      setName(draft.name ?? "");
      setEmail(draft.email ?? "");
      setProfession(draft.profession ?? "");
      setLinkedin(draft.linkedin ?? "");
      setIndex(typeof draft.index === "number" ? Math.max(0, draft.index) : 0);
      setAnswers(draft.answers ?? {});
    } else {
      setSessionId(createSessionId());
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !sessionId) return;
    saveDraft({
      version: 1,
      sessionId,
      phase,
      name,
      email,
      profession,
      linkedin,
      index,
      answers
    });
  }, [ready, sessionId, phase, name, email, profession, linkedin, index, answers]);

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

  useEffect(() => {
    if (!traces.length) return;
    setIndex((i) => Math.min(i, traces.length - 1));
  }, [traces.length]);

  const current = traces[index];
  const currentAnswer = current
    ? answers[current.trace_id] ?? { state: "", confidence: null, notes: "" }
    : { state: "", confidence: null, notes: "" };

  const progress = useMemo(() => {
    if (!traces.length) return 0;
    return Math.round((Object.keys(answers).length / traces.length) * 100);
  }, [answers, traces.length]);

  const judgmentRules = useMemo(() => {
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

  function RulesToggle() {
    return (
      <div className="space-y-3">
        <button
          type="button"
          className="text-sm font-medium text-sky-700 hover:text-sky-800 hover:underline"
          onClick={() => setShowRules((v) => !v)}
        >
          {showRules ? "Hide judgment rules" : "Show judgment rules"}
        </button>
        {showRules ? (
          <div className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
            <p className="mb-3 border-b border-zinc-200 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              How to judge each trace
            </p>
            {judgmentRules || "Judgment rules are unavailable right now."}
          </div>
        ) : null}
      </div>
    );
  }

  function updateAnswer(patch: Partial<Answer>) {
    if (!current) return;
    if (patch.state) setError("");
    setAnswers((prev) => ({
      ...prev,
      [current.trace_id]: {
        ...currentAnswer,
        ...patch
      }
    }));
  }

  const canSave = Boolean(currentAnswer.state) && !saving;

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

  async function handleStart() {
    setProfileError("");
    setResumeNotice("");
    if (!name.trim()) {
      setProfileError("Please enter your name.");
      return;
    }
    if (!email.trim()) {
      setProfileError("Please enter your email.");
      return;
    }
    if (!isValidEmail(email)) {
      setProfileError("Please enter a valid email (e.g. you@university.edu).");
      return;
    }

    setStarting(true);
    try {
      const remote = await resumeStudyProgress({
        email: email.trim(),
        name: name.trim()
      });

      if (remote.found) {
        const restored: Record<string, Answer> = {};
        for (const item of remote.answers) {
          restored[item.trace_id] = {
            state: item.state,
            confidence: item.confidence,
            notes: item.notes || ""
          };
        }
        setSessionId(remote.session_id || sessionId);
        setAnswers(restored);
        setIndex(remote.next_index || 0);
        if (remote.completed) {
          setResumeNotice(
            `Welcome back — all ${remote.labeled_count} traces are already labeled for this email.`
          );
          setPhase("done");
        } else {
          setResumeNotice(
            `Welcome back — resumed at trace ${remote.next_index + 1} (${remote.labeled_count} already saved).`
          );
          setPhase("quiz");
        }
        return;
      }

      setPhase("quiz");
    } catch (err) {
      // Offline / API failure: still allow local progress
      setResumeNotice(
        err instanceof Error
          ? `Could not check server progress (${err.message}). Continuing on this device.`
          : "Could not check server progress. Continuing on this device."
      );
      setPhase("quiz");
    } finally {
      setStarting(false);
    }
  }

  const canStart = Boolean(name.trim()) && isValidEmail(email) && !starting;

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
        try {
          const result = await completeStudy({
            session_id: sessionId,
            annotator_name: name.trim(),
            annotator_email: email.trim(),
            labeled_count: Object.keys(nextAnswers).length
          });
          setEmailNotice(
            result.emailed
              ? `A confirmation email was sent to ${email.trim()}.`
              : "Labels saved. Confirmation email could not be sent (email service may be unset)."
          );
        } catch {
          setEmailNotice("Labels saved. Confirmation email could not be sent.");
        }
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

  function handleStartOver() {
    clearDraft();
    setSessionId(createSessionId());
    setPhase("intro");
    setIndex(0);
    setAnswers({});
    setError("");
    setProfileError("");
    setEmailNotice("");
    setResumeNotice("");
  }

  if (loading || !ready || !sessionId) {
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
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
              <p className="font-medium">You can leave anytime and continue later.</p>
              <p className="mt-1 text-sky-900/90">
                Come back with the <strong>same name and email</strong> and you will start from the
                same step. Progress is also saved in this browser.
              </p>
            </div>

            <p>
              Choose <strong>one</strong> behavioral state per trace. Judge only from
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (profileError) setProfileError("");
                  }}
                  className={`w-full rounded-xl border bg-white px-3.5 py-2.5 outline-none transition focus:ring-2 focus:ring-zinc-300 ${
                    email.trim() && !isValidEmail(email)
                      ? "border-red-400 focus:border-red-500"
                      : "border-zinc-300 focus:border-zinc-500"
                  }`}
                  placeholder="you@university.edu"
                  autoComplete="email"
                  inputMode="email"
                />
                {email.trim() && !isValidEmail(email) ? (
                  <span className="block text-xs text-red-600">
                    Needs a domain, e.g. name@school.edu
                  </span>
                ) : null}
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

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleStart}
                disabled={!canStart}
                className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition sm:w-auto sm:min-w-[180px] ${
                  canStart
                    ? "bg-zinc-900 text-white hover:bg-zinc-800"
                    : "cursor-not-allowed bg-zinc-200 text-zinc-500"
                }`}
              >
                {starting ? "Checking progress..." : "Start labeling"}
              </button>
              {!canStart && !starting ? (
                <p className="text-xs text-zinc-500">
                  Enter your name and a valid email to enable Start labeling.
                </p>
              ) : null}
            </div>

            <RulesToggle />
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
          {resumeNotice ? (
            <p className="mb-3 text-sm text-emerald-800">{resumeNotice}</p>
          ) : null}
          {emailNotice ? (
            <p className="mb-3 text-sm text-zinc-700">{emailNotice}</p>
          ) : (
            <p className="mb-4 text-sm text-zinc-600">
              You can close this tab. Labels were saved to the server as you went.
            </p>
          )}
          <p className="mb-4 text-sm text-zinc-600">
            Returning later with the same name and email resumes from the same step.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/" className="text-sm text-sky-700 hover:underline">
              Back to LLMSheriff
            </Link>
            <button
              type="button"
              onClick={handleStartOver}
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:underline"
            >
              Start a new session
            </button>
          </div>
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
            Leave anytime — same email resumes
          </span>
          <span className="rounded-full bg-zinc-200/70 px-3 py-1 text-xs font-medium text-zinc-700">
            {index + 1} / {traces.length}
          </span>
          <span className="rounded-full bg-zinc-200/70 px-3 py-1 text-xs font-medium text-zinc-700">
            {progress}% answered
          </span>
        </div>
      </div>

      <Panel className="rounded-2xl border-zinc-200 p-4 shadow-sm sm:p-6">
        {resumeNotice ? (
          <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {resumeNotice}
          </p>
        ) : null}
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <SectionTitle
            title={current?.trace_id ?? "Trace"}
            description="Pick the single best behavioral state for this whole run."
          />
          <button
            type="button"
            className="shrink-0 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-sky-700 hover:border-sky-400 hover:bg-sky-50"
            onClick={() => setShowRules((v) => !v)}
          >
            {showRules ? "Hide judgment rules" : "Judgment rules"}
          </button>
        </div>

        {showRules ? (
          <div className="mb-5 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-sky-200 bg-sky-50/60 p-4 text-sm leading-6 text-zinc-700">
            <p className="mb-3 border-b border-sky-200 pb-2 text-xs font-semibold uppercase tracking-wide text-sky-800">
              How to judge each trace
            </p>
            {judgmentRules || "Judgment rules are unavailable right now."}
          </div>
        ) : null}

        <pre className="mb-5 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs leading-5 text-zinc-800">
          {current?.text}
        </pre>

        <div
          className={`mb-2 rounded-xl p-1 ${
            error && !currentAnswer.state ? "ring-2 ring-red-400 ring-offset-2" : ""
          }`}
        >
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Behavioral state <span className="text-red-500">*</span>
            </p>
            {!currentAnswer.state ? (
              <p className="text-xs text-zinc-500">Required before saving</p>
            ) : (
              <p className="text-xs font-medium text-emerald-700">Selected: {currentAnswer.state}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {states.map((state) => {
              const active = currentAnswer.state === state;
              return (
                <button
                  key={state}
                  type="button"
                  onClick={() => updateAnswer({ state })}
                  aria-pressed={active}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                      : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500 hover:bg-zinc-50"
                  }`}
                >
                  {state}
                </button>
              );
            })}
          </div>
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
                  {n} {n === 1 ? "(low)" : n === 5 ? "(high)" : ""}
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

        <div className="sticky bottom-3 z-10 mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white/95 p-3 backdrop-blur sm:bottom-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={index === 0 || saving}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canSave}
            title={!currentAnswer.state ? "Select a behavioral state first" : undefined}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              canSave
                ? "bg-zinc-900 text-white hover:bg-zinc-800"
                : "cursor-not-allowed bg-zinc-200 text-zinc-500"
            }`}
          >
            {saving
              ? "Saving..."
              : index >= traces.length - 1
                ? "Save & finish"
                : "Save & next"}
          </button>
          {!currentAnswer.state ? (
            <span className="text-xs text-zinc-500">Select a state to enable save</span>
          ) : null}
        </div>
      </Panel>
      </div>
    </main>
  );
}
