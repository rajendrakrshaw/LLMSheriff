"use client";

import { BookOpen, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const LABELS = [
  {
    name: "Completed",
    when: "The goal appears to have been successfully completed by the end of the trace.",
    example: "Many different successful steps; the run looks finished."
  },
  {
    name: "Recovering",
    when: "The run encounters failures but later changes strategy and resumes meaningful progress.",
    example: "API fails twice, then a different API succeeds."
  },
  {
    name: "Waiting",
    when: "Progress is paused because the agent is waiting on an external system or event.",
    example: "“Poll CI status: pending”, “await”, “waiting for…”."
  },
  {
    name: "Stalled",
    when: "The run repeatedly performs nearly identical work without meaningful progress.",
    example: "The same search runs 8+ times in a row."
  },
  {
    name: "Abandoned",
    when: "Long idle periods suggest the run is no longer actively pursuing the goal.",
    example: "“Determine next action” repeated with long gaps between steps."
  },
  {
    name: "Executing",
    when: "The agent is still doing productive work, but the goal is not clearly finished yet.",
    example: "Active successful steps mid-run without a clear completion."
  },
  {
    name: "Planning",
    when: "Most of the trace is early decomposition or strategy before substantial work.",
    example: "Mostly planning / breaking down the task early on."
  },
  {
    name: "Failed",
    when: "The run keeps failing and never finds a successful recovery path.",
    example: "Repeated hard failures with no successful turnaround."
  }
] as const;

const COMPARISONS = [
  {
    title: "Waiting vs Stalled",
    left: "Waiting = paused on an external status (pending / poll / await)",
    right: "Stalled = repeating nearly the same work action without progress"
  },
  {
    title: "Stalled vs Abandoned",
    left: "Stalled = fast repeats, short gaps",
    right: "Abandoned = long idle gaps; no longer actively pursuing the goal"
  },
  {
    title: "Recovering vs Failed",
    left: "Recovering = fails, then later succeeds with a new strategy",
    right: "Failed = keeps failing with no successful recovery"
  },
  {
    title: "Completed vs Executing",
    left: "Completed = goal looks done by the end",
    right: "Executing = still mid-way / not clearly finished"
  }
] as const;

export function JudgmentRules({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="shrink-0 gap-2"
        onClick={() => onOpenChange(!open)}
      >
        <BookOpen className="size-4" />
        Labeling guide
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Labeling guide"
          onClick={() => onOpenChange(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Labeling guide</p>
                <p className="text-xs text-muted-foreground">
                  How to assign one label to the whole run
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => onOpenChange(false)}
              >
                <X className="size-4" />
                Close
              </Button>
            </div>

            <div className="space-y-4 overflow-y-auto p-4">
              <div className="space-y-2 text-sm leading-6">
                <p className="font-medium text-foreground">
                  Your task is to assign one label to the entire execution trace.
                </p>
                <p className="text-muted-foreground">
                  Base your decision only on the observable events shown. Do not infer the
                  agent&apos;s private thoughts or intentions.
                </p>
                <p className="text-muted-foreground">
                  Choose the label that best describes the{" "}
                  <strong className="text-foreground">overall</strong> behavior of the run —
                  especially how it ends. Do not label only the first half or a single step.
                </p>
                <p className="text-muted-foreground">
                  If you are unsure between two labels, choose the one that best matches behavior
                  near the <strong className="text-foreground">end of the run</strong> and use the
                  confidence rating to show uncertainty.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Labels (pick one)
                </p>
                <div className="grid gap-2">
                  {LABELS.map((label) => (
                    <div
                      key={label.name}
                      className="rounded-lg border bg-muted/20 px-3 py-2.5"
                    >
                      <p className="text-sm font-semibold text-foreground">{label.name}</p>
                      <p className="mt-0.5 text-sm text-foreground/90">{label.when}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Example: {label.example}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  If two labels feel close
                </p>
                <div className="grid gap-2">
                  {COMPARISONS.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-lg border bg-muted/20 px-3 py-2.5"
                    >
                      <p className="text-sm font-medium">{item.title}</p>
                      <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                        <li>• {item.left}</li>
                        <li>• {item.right}</li>
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-1 text-xs leading-5 text-muted-foreground">
                <p>
                  Steps: read events top → bottom → pick one label → set confidence → optional
                  note → Save & next.
                </p>
                <p>
                  There are no right or wrong answers. Choose the label that best matches your
                  interpretation of the observable behavior.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
