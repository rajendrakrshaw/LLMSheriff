import { AnalyzeResponse } from "@/types/intent";
import { AlertTriangle } from "lucide-react";
import { Panel, SectionTitle } from "@/components/ui";

type IntentTimelineProps = {
  trace: Array<{ timestamp: string; step: string; duration: number }>;
  result: AnalyzeResponse | null;
};

function stepToState(step: string): string {
  const s = step.toUpperCase();
  if (s === "PLANNING") return "Planning";
  if (s.includes("LLM")) return "Executing";
  if (s.includes("TOOL")) return "Executing";
  if (s.includes("WAIT")) return "Waiting";
  if (s.includes("RETRY")) return "Recovering";
  return "Executing";
}

const NEEDS_ATTENTION = new Set(["Stalled", "Abandoned", "Failed"]);

export function IntentTimeline({ trace, result }: IntentTimelineProps) {
  const finalState = result?.rule_engine.state ?? null;

  const steps = trace.map((item) => ({
    time: item.timestamp.slice(11, 16),
    state: stepToState(item.step),
    label: item.step,
    duration: item.duration
  }));

  if (finalState && steps.length > 0) {
    steps[steps.length - 1].state = finalState;
  }

  return (
    <Panel>
      <SectionTitle
        title="Intent timeline"
        description="Behavioral state inferred per execution step."
      />

      {steps.length === 0 ? (
        <p className="text-sm text-zinc-500">Run analysis to see intent timeline.</p>
      ) : (
        <div className="mt-2">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="mt-1.5 h-2 w-2 rounded-full bg-zinc-400" />
                {idx < steps.length - 1 && <div className="w-px flex-1 bg-zinc-200" style={{ minHeight: "28px" }} />}
              </div>
              <div className="pb-5">
                <p className="text-xs text-zinc-400">{step.time}</p>
                <p className="text-sm font-medium text-zinc-900">{step.state}</p>
                <p className="text-xs text-zinc-500">
                  {step.label} · {step.duration}s
                </p>
              </div>
            </div>
          ))}

          {finalState && (
            <div className="mt-1 rounded border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Final predicted intent</p>
              <p className="mt-1 text-base font-medium text-zinc-900">{finalState}</p>
              {NEEDS_ATTENTION.has(finalState) && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Human intervention may be required.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
