"use client";

import Link from "next/link";
import { CheckCircle2, Info, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
              <CardTitle className="text-xl">Behavioral state labeling</CardTitle>
              <CardDescription>
                About 20–30 minutes. 40 short synthetic agent traces. No account required.
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

              <p className="text-sm leading-6 text-muted-foreground">
                Choose <strong className="text-foreground">one</strong> behavioral state per
                trace. Judge only from visible events — not the agent&apos;s private thoughts.
              </p>

              <div className="flex flex-wrap gap-2">
                {["Completed", "Recovering", "Waiting", "Stalled", "Abandoned"].map((label) => (
                  <Badge key={label} variant="outline">
                    {label}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Also allowed if needed: Planning, Executing, Failed.
              </p>

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
                  Pick the single best behavioral state for this whole run.
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
                  Behavioral state <span className="text-destructive">*</span>
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
                <Label>Confidence (optional)</Label>
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
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} {n === 1 ? "(low)" : n === 5 ? "(high)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="study-notes">Notes (optional)</Label>
                <Textarea
                  id="study-notes"
                  value={currentAnswer.notes}
                  onChange={(e) => updateAnswer({ notes: e.target.value })}
                  placeholder="Why this state?"
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
              <span className="text-xs text-muted-foreground">Select a state to enable save</span>
            ) : null}
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
