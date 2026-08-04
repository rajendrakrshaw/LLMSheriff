"use client";

import Link from "next/link";
import { CheckCircle2, Info, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  completeStudy,
  fetchStudyTraces,
  resumeStudyProgress,
  submitStudyAnnotations,
  type StudyTrace
} from "@/lib/api";
import { JudgmentRules } from "@/components/JudgmentRules";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Progress,
  ProgressLabel,
  ProgressValue
} from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Answer = {
  state: string;
  confidence: number | null;
  notes: string;
};

type Phase = "intro" | "quiz" | "done";

type StudyDraft = {
  version: 2;
  sessionId: string;
  phase: Phase;
  name: string;
  email: string;
  profession: string;
  linkedin: string;
  index: number;
  answers: Record<string, Answer>;
};

const STORAGE_KEY = "llmsheriff_study_progress_v2";

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function loadDraft(): StudyDraft | null {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem("llmsheriff_study_progress_v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudyDraft;
    if (!parsed?.sessionId) return null;
    if (parsed.version !== 1 && parsed.version !== 2) return null;
    return { ...parsed, version: 2 };
  } catch {
    return null;
  }
}

function saveDraft(draft: StudyDraft) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, version: 2 }));
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
  const allowPersist = useRef(false);

  function persistDraft( partial?: Partial<StudyDraft>) {
    if (!sessionId) return;
    saveDraft({
      version: 2,
      sessionId,
      phase,
      name,
      email,
      profession,
      linkedin,
      index,
      answers,
      ...partial
    });
  }

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
    // Avoid wiping restored draft with empty initial state.
    const t = window.setTimeout(() => {
      allowPersist.current = true;
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready || !sessionId || !allowPersist.current) return;
    persistDraft();
  }, [ready, sessionId, phase, name, email, profession, linkedin, index, answers]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pack = await fetchStudyTraces();
        if (cancelled) return;
        setTraces(pack.traces);
        setStates(pack.states);
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

  function updateAnswer(patch: Partial<Answer>) {
    if (!current) return;
    if (patch.state) setError("");
    const next = {
      ...answers,
      [current.trace_id]: {
        ...currentAnswer,
        ...patch
      }
    };
    setAnswers(next);
    persistDraft({ answers: next });
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

      const localAnswers = { ...answers };
      if (remote.found) {
        const restored: Record<string, Answer> = { ...localAnswers };
        for (const item of remote.answers) {
          restored[item.trace_id] = {
            state: item.state,
            confidence: item.confidence,
            notes: item.notes || ""
          };
        }
        const nextSession = remote.session_id || sessionId;
        setSessionId(nextSession);
        setAnswers(restored);
        // Prefer first unlabeled in shuffled order; fall back to remote hint.
        let nextIndex = remote.next_index || 0;
        if (traces.length) {
          const labeled = new Set(Object.keys(restored).filter((id) => restored[id]?.state));
          const firstOpen = traces.findIndex((t) => !labeled.has(t.trace_id));
          if (firstOpen >= 0) nextIndex = firstOpen;
        }
        setIndex(nextIndex);
        persistDraft({
          sessionId: nextSession,
          answers: restored,
          index: nextIndex,
          phase: remote.completed ? "done" : "quiz",
          name: name.trim(),
          email: email.trim()
        });
        if (remote.completed) {
          setResumeNotice(
            `Welcome back — all ${remote.labeled_count} traces are already labeled for this email.`
          );
          setPhase("done");
        } else {
          setResumeNotice(
            `Welcome back — resumed with ${Object.keys(restored).length} saved label(s).`
          );
          setPhase("quiz");
        }
        return;
      }

      // Keep any local answers; just enter quiz.
      persistDraft({ phase: "quiz", name: name.trim(), email: email.trim() });
      setPhase("quiz");
    } catch (err) {
      setResumeNotice(
        err instanceof Error
          ? `Could not check server progress (${err.message}). Continuing with local progress.`
          : "Could not check server progress. Continuing with local progress."
      );
      persistDraft({ phase: "quiz" });
      setPhase("quiz");
    } finally {
      setStarting(false);
    }
  }

  const canStart = Boolean(name.trim()) && isValidEmail(email) && !starting;

  async function handleNext() {
    if (!current || !currentAnswer.state) {
      setError("Please choose a label before continuing.");
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
      persistDraft({ answers: nextAnswers, index });
      try {
        await persistCurrent(nextAnswers);
      } catch (err) {
        // Keep local progress even if server save fails (e.g. Render cold start).
        setError(
          err instanceof Error
            ? `Server save failed (${err.message}). Progress kept on this device — you can continue.`
            : "Server save failed. Progress kept on this device — you can continue."
        );
        // Still allow navigation so annotators are not blocked.
      }
      if (index >= traces.length - 1) {
        setPhase("done");
        persistDraft({ answers: nextAnswers, phase: "done" });
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
              : "Labels saved locally. Confirmation email could not be sent (email service may be unset)."
          );
        } catch {
          setEmailNotice("Progress saved on this device. Confirmation email could not be sent.");
        }
      } else {
        const nextIndex = index + 1;
        setIndex(nextIndex);
        persistDraft({ answers: nextAnswers, index: nextIndex });
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
      <main className="min-h-[calc(100vh-140px)] bg-muted/40 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading annotation study...
        </div>
      </main>
    );
  }

  if (error && !traces.length) {
    return (
      <main className="min-h-[calc(100vh-140px)] bg-muted/40 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Alert variant="destructive">
            <AlertTitle>Study unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button variant="link" className="mt-3 px-0" render={<Link href="/" />}>
            Back to LLMSheriff
          </Button>
        </div>
      </main>
    );
  }

  if (phase === "intro") {
    return (
      <main className="min-h-[calc(100vh-140px)] bg-muted/40 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" size="sm" render={<Link href="/" />}>
              ← LLMSheriff
            </Button>
            <Badge variant="secondary">EPFL annotation study</Badge>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Label agent runs</CardTitle>
              <CardDescription>
                About 20–30 minutes. 40 short AI agent logs. No account required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Alert>
                <Info className="size-4" />
                <AlertTitle>You can leave anytime and continue later</AlertTitle>
                <AlertDescription>
                  Come back with the same name and email and you will start from the same step.
                  Progress is also saved in this browser.
                </AlertDescription>
              </Alert>

              <div className="space-y-2 text-sm leading-6 text-muted-foreground">
                <p>
                  <strong className="text-foreground">Your task</strong> is to assign one label
                  to each entire execution trace based only on the observable events.
                </p>
                <p>
                  Do not infer the agent&apos;s private thoughts or intentions. Choose the label
                  that best describes the <strong className="text-foreground">overall</strong>{" "}
                  behavior of the run — especially how it ends.
                </p>
                <p>
                  If you are unsure between two labels, pick the best match and use the confidence
                  rating to show uncertainty. There are no right or wrong answers.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  "Completed",
                  "Recovering",
                  "Waiting",
                  "Stalled",
                  "Abandoned",
                  "Executing",
                  "Planning",
                  "Failed"
                ].map((label) => (
                  <Badge key={label} variant="outline">
                    {label}
                  </Badge>
                ))}
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="study-name">
                    Full name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="study-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. A. Sharma"
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="study-email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="study-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (profileError) setProfileError("");
                    }}
                    placeholder="you@university.edu"
                    autoComplete="email"
                    inputMode="email"
                    aria-invalid={Boolean(email.trim() && !isValidEmail(email))}
                  />
                  {email.trim() && !isValidEmail(email) ? (
                    <p className="text-xs text-destructive">
                      Needs a domain, e.g. name@school.edu
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="study-profession">Profession / role</Label>
                  <Input
                    id="study-profession"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="e.g. PhD student, ML engineer"
                    autoComplete="organization-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="study-linkedin">LinkedIn (optional)</Label>
                  <Input
                    id="study-linkedin"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    autoComplete="url"
                  />
                </div>
              </div>

              {profileError ? (
                <Alert variant="destructive">
                  <AlertDescription>{profileError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-2">
                <Button size="lg" disabled={!canStart} onClick={handleStart} className="min-w-44">
                  {starting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Checking progress...
                    </>
                  ) : (
                    "Start labeling"
                  )}
                </Button>
                {!canStart && !starting ? (
                  <p className="text-xs text-muted-foreground">
                    Enter your name and a valid email to enable Start labeling.
                  </p>
                ) : null}
              </div>

              <JudgmentRules open={showRules} onOpenChange={setShowRules} />

              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (phase === "done") {
    return (
      <main className="min-h-[calc(100vh-140px)] bg-muted/40 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardHeader>
              <div className="mb-1 flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="size-5" />
                <CardTitle>Thank you</CardTitle>
              </div>
              <CardDescription>
                Saved labels for this session ({sessionId.slice(0, 8)}…). Your help strengthens
                the EPFL paper evaluation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {resumeNotice ? (
                <Alert>
                  <AlertDescription>{resumeNotice}</AlertDescription>
                </Alert>
              ) : null}
              {emailNotice ? (
                <Alert>
                  <AlertDescription>{emailNotice}</AlertDescription>
                </Alert>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You can close this tab. Labels were saved to the server as you went.
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Returning later with the same name and email resumes from the same step.
              </p>
            </CardContent>
            <CardFooter className="gap-3">
              <Button variant="outline" render={<Link href="/" />}>
                Back to LLMSheriff
              </Button>
              <Button variant="ghost" onClick={handleStartOver}>
                Start a new session
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-140px)] bg-muted/40 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" render={<Link href="/" />}>
            ← LLMSheriff
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Leave anytime — same email resumes</Badge>
            <Badge variant="outline">
              {index + 1} / {traces.length}
            </Badge>
          </div>
        </div>

        <Progress value={progress} className="w-full">
          <ProgressLabel>Answered</ProgressLabel>
          <ProgressValue />
        </Progress>

        <Card>
          {resumeNotice ? (
            <div className="px-4 pt-4">
              <Alert>
                <AlertDescription>{resumeNotice}</AlertDescription>
              </Alert>
            </div>
          ) : null}

          <CardHeader className="border-b">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{current?.trace_id ?? "Trace"}</CardTitle>
                <CardDescription>
                  Assign one label to this entire run based only on observable events.
                </CardDescription>
              </div>
              <JudgmentRules open={showRules} onOpenChange={setShowRules} />
            </div>
          </CardHeader>

          <CardContent className="space-y-5 pt-5">
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl border bg-muted/30 p-4 font-mono text-xs leading-5 text-foreground">
              {current?.text}
            </pre>

            <div
              className={cn(
                "space-y-3 rounded-xl p-1",
                error && !currentAnswer.state && "ring-2 ring-destructive ring-offset-2"
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <Label>
                  Your label <span className="text-destructive">*</span>
                </Label>
                {!currentAnswer.state ? (
                  <span className="text-xs text-muted-foreground">Required before saving</span>
                ) : (
                  <Badge>Selected: {currentAnswer.state}</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {states.map((state) => {
                  const active = currentAnswer.state === state;
                  return (
                    <Button
                      key={state}
                      type="button"
                      variant={active ? "default" : "outline"}
                      className="h-auto py-2.5"
                      onClick={() => updateAnswer({ state })}
                      aria-pressed={active}
                    >
                      {state}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Confidence</Label>
                <Select
                  value={
                    currentAnswer.confidence != null
                      ? String(currentAnswer.confidence)
                      : "none"
                  }
                  onValueChange={(value) =>
                    updateAnswer({
                      confidence: value && value !== "none" ? Number(value) : null
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select confidence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    <SelectItem value="1">1 — Guessing</SelectItem>
                    <SelectItem value="2">2 — Low</SelectItem>
                    <SelectItem value="3">3 — Moderate</SelectItem>
                    <SelectItem value="4">4 — High</SelectItem>
                    <SelectItem value="5">5 — Very high</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  If unsure between two labels, choose one and mark lower confidence.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="study-notes">Notes (optional)</Label>
                <Textarea
                  id="study-notes"
                  value={currentAnswer.notes}
                  onChange={(e) => updateAnswer({ notes: e.target.value })}
                  placeholder="Why this label?"
                  className="min-h-20"
                />
              </div>
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>

          <CardFooter className="sticky bottom-3 z-10 mt-2 flex flex-wrap gap-3 border bg-card/95 backdrop-blur sm:bottom-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={index === 0 || saving}
            >
              Back
            </Button>
            <Button type="button" onClick={handleNext} disabled={!canSave}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : index >= traces.length - 1 ? (
                "Save & finish"
              ) : (
                "Save & next"
              )}
            </Button>
            {!currentAnswer.state ? (
              <span className="text-xs text-muted-foreground">Select a label to enable save</span>
            ) : null}
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
