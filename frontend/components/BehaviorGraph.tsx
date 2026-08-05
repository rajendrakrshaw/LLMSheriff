import { AnalyzeResponse } from "@/types/intent";
import { TrendingDown } from "lucide-react";
import { Panel, SectionTitle } from "@/components/layout";

type BehaviorGraphProps = {
  trace: Array<{ step: string; action: string; duration: number; status?: string }>;
  result: AnalyzeResponse | null;
};

function categorize(step: string, action: string, status?: string): string {
  const s = step.toUpperCase();
  const a = action.toLowerCase();
  if (s.includes("PLAN")) return "Planning";
  if (a.includes("retry") || status === "failed") return "Retrying";
  if (a.includes("poll") || a.includes("wait") || a.includes("pending")) return "Waiting";
  if (a.includes("search") || a.includes("read") || a.includes("fetch")) return "Searching";
  if (s.includes("LLM")) return "Reasoning";
  if (s.includes("TOOL")) return "Tool use";
  return "Executing";
}

function buildBuckets(trace: BehaviorGraphProps["trace"]) {
  const counts: Record<string, number> = {};
  for (const item of trace) {
    const key = categorize(item.step, item.action, item.status);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts).map(([label, count]) => ({ label, count }));
}

function buildConfidenceSeries(trace: BehaviorGraphProps["trace"], result: AnalyzeResponse | null) {
  if (!result || trace.length === 0) return [];

  const finalConf = (result.rule_engine.confidence + result.llm_engine.confidence) / 2;
  const series: number[] = [];
  let streak = 1;

  for (let i = 0; i < trace.length; i++) {
    if (i > 0 && trace[i].action === trace[i - 1].action) streak += 1;
    else streak = 1;

    const failedPenalty = trace[i].status === "failed" ? 0.08 : 0;
    const repeatPenalty = Math.max(0, streak - 1) * 0.06;
    const progress = Math.max(0.15, (i + 1) / trace.length);
    const value = Math.max(0.1, Math.min(1, finalConf * progress + 0.2 - repeatPenalty - failedPenalty));
    series.push(Math.round(value * 100));
  }
  return series;
}

export function BehaviorGraph({ trace, result }: BehaviorGraphProps) {
  const buckets = buildBuckets(trace);
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);
  const confidenceSeries = buildConfidenceSeries(trace, result);

  return (
    <Panel>
      <SectionTitle
        title="Behavior graph"
        description="Activity distribution and confidence trajectory."
      />

      {trace.length === 0 ? (
        <p className="text-sm text-zinc-500">Load a trace to see behavior patterns.</p>
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            {buckets.map((bucket) => (
              <div key={bucket.label}>
                <div className="mb-1 flex justify-between text-xs text-zinc-500">
                  <span>{bucket.label}</span>
                  <span>{bucket.count}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-200">
                  <div
                    className="h-2 rounded-full bg-zinc-600"
                    style={{ width: `${(bucket.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {confidenceSeries.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-medium text-zinc-500">Confidence trajectory</p>
              <div className="flex h-20 items-end gap-1">
                {confidenceSeries.map((value, idx) => (
                  <div key={idx} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-zinc-500"
                      style={{ height: `${value}%` }}
                      title={`Step ${idx + 1}: ${value}%`}
                    />
                    <span className="text-[10px] text-zinc-400">{idx + 1}</span>
                  </div>
                ))}
              </div>
              {confidenceSeries.length > 1 &&
                confidenceSeries[confidenceSeries.length - 1] < confidenceSeries[0] - 15 && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-800">
                    <TrendingDown className="h-3.5 w-3.5" />
                    Confidence declined across execution.
                  </p>
                )}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
