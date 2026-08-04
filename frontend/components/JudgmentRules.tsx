"use client";

import { BookOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

const PRIMARY_STATES = [
  {
    name: "Completed",
    when: "The run looks finished and successful.",
    example: "Many different successful steps; the goal looks done."
  },
  {
    name: "Recovering",
    when: "It failed at first, then tried a new approach and made progress.",
    example: "API fails twice, then a different API works."
  },
  {
    name: "Waiting",
    when: "It is blocked on something outside itself.",
    example: "“Poll CI status: pending”, “await”, “waiting for…”."
  },
  {
    name: "Stalled",
    when: "It repeats the same work action quickly, with little progress.",
    example: "The same search runs 8+ times in a row."
  },
  {
    name: "Abandoned",
    when: "Long pauses / idle drift — weak progress, not active polling.",
    example: "“Determine next action” repeated with long gaps."
  }
] as const;

const EXTRA_STATES = [
  {
    name: "Executing",
    when: "Still doing useful work, but not clearly finished."
  },
  {
    name: "Planning",
    when: "Mostly early planning before real work starts."
  },
  {
    name: "Failed",
    when: "Keeps failing and never recovers."
  }
] as const;

const COMPARISONS = [
  {
    title: "Waiting vs Stalled",
    left: "Waiting = checking an outside status (pending / poll / await)",
    right: "Stalled = repeating the same work action quickly"
  },
  {
    title: "Stalled vs Abandoned",
    left: "Stalled = fast repeats, short gaps",
    right: "Abandoned = long gaps, slow / idle"
  },
  {
    title: "Recovering vs Failed",
    left: "Recovering = fails, then later succeeds another way",
    right: "Failed = fails and never recovers"
  },
  {
    title: "Completed vs Executing",
    left: "Completed = looks done",
    right: "Executing = still mid-way"
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
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger
        render={
          <Button
            variant="outline"
            size="lg"
            className="w-full justify-start gap-2 sm:w-auto"
          />
        }
      >
        <BookOpen className="size-4" />
        {open ? "Hide judgment rules" : "Show judgment rules"}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <div className="max-h-[28rem] space-y-4 overflow-auto rounded-xl border bg-muted/30 p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Read the events. Pick one label for the whole run.
            </p>
            <p className="text-sm text-muted-foreground">
              Only use what you can see. Do not guess the agent&apos;s private thoughts.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Common labels
              </p>
              <Badge variant="secondary">use these most often</Badge>
            </div>
            <div className="grid gap-2">
              {PRIMARY_STATES.map((state) => (
                <div
                  key={state.name}
                  className="rounded-lg border bg-background px-3 py-2.5"
                >
                  <p className="text-sm font-semibold text-foreground">{state.name}</p>
                  <p className="mt-0.5 text-sm text-foreground/90">{state.when}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Example: {state.example}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Less common labels
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {EXTRA_STATES.map((state) => (
                <div
                  key={state.name}
                  className="rounded-lg border bg-background px-3 py-2.5"
                >
                  <p className="text-sm font-semibold">{state.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{state.when}</p>
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
                <div key={item.title} className="rounded-lg border bg-background px-3 py-2.5">
                  <p className="text-sm font-medium">{item.title}</p>
                  <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                    <li>• {item.left}</li>
                    <li>• {item.right}</li>
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Steps: read top → bottom → tap one label → optional confidence/note → Save & next.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
