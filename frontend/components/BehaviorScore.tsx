import { AnalyzeResponse } from "@/types/intent";
import { Panel, SectionTitle } from "@/components/ui";

type BehaviorScoreProps = {
  result: AnalyzeResponse | null;
};

function clampPct(value: number): string {
  return `${Math.min(100, Math.max(0, Math.round(value * 100)))}%`;
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(value * 100)));
  return (
    <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-200">
      <div className="h-1.5 rounded-full bg-zinc-700" style={{ width: `${pct}%` }} />
    </div>
  );
}

function riskLabel(progress: number, failedSteps: number, repeated: number) {
  if (failedSteps >= 3 || repeated >= 5) return "High";
  if (progress < 0.5 || repeated >= 3) return "Medium";
  return "Low";
}

export function BehaviorScore({ result }: BehaviorScoreProps) {
  const m = result?.metrics;
  const progress = Math.min(1, m?.progress_score ?? 0);
  const failedSteps = m?.failed_steps ?? 0;
  const repeated = m?.consecutive_repeated_actions ?? 0;
  const avgConf = result ? (result.rule_engine.confidence + result.llm_engine.confidence) / 2 : 0;
  const behaviorScore = result
    ? Math.min(1, Math.max(0, progress - failedSteps * 0.1 - Math.max(0, (repeated - 1) * 0.05)))
    : 0;
  const risk = result ? riskLabel(progress, failedSteps, repeated) : "–";

  return (
    <Panel>
      <SectionTitle title="Behavior score" />

      {!result ? (
        <p className="text-sm text-zinc-500">Run analysis to see scores.</p>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Goal progress</span>
              <span className="font-medium">{clampPct(progress)}</span>
            </div>
            <ProgressBar value={progress} />
          </div>

          <div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Behavior score</span>
              <span className="font-medium">{clampPct(behaviorScore)}</span>
            </div>
            <ProgressBar value={behaviorScore} />
          </div>

          <div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Analyzer confidence</span>
              <span className="font-medium">{clampPct(avgConf)}</span>
            </div>
            <ProgressBar value={avgConf} />
          </div>

          <div className="flex items-center justify-between border-t border-zinc-200 pt-3 text-sm">
            <span className="text-zinc-500">Risk level</span>
            <span className="font-medium text-zinc-900">{risk}</span>
          </div>

          {(failedSteps > 0 || repeated > 2) && (
            <div className="rounded border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 space-y-1">
              {failedSteps > 0 && <p>{failedSteps} failed step(s) detected.</p>}
              {repeated > 2 && <p>{repeated} consecutive repeated actions.</p>}
              {result.rule_engine.state !== result.llm_engine.state && (
                <p>Analyzers disagree on behavioral state.</p>
              )}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
