import { AnalyzeResponse } from "@/types/intent";
import { Check, X } from "lucide-react";
import { Panel, SectionTitle } from "@/components/ui";
import { isNegativeEvidence, isPositiveEvidence, stripEvidencePrefix } from "@/lib/text";

type PredictionCardsProps = {
  result: AnalyzeResponse | null;
};

function PredictionCard({
  title,
  subtitle,
  state,
  confidence,
  reasons,
  agree
}: {
  title: string;
  subtitle: string;
  state: string | undefined;
  confidence: number | undefined;
  reasons: string[];
  agree: boolean | null;
}) {
  const pct = confidence !== undefined ? Math.round(confidence * 100) : null;

  return (
    <Panel>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
          <p className="text-xs text-zinc-500">{subtitle}</p>
        </div>
        {agree === true && (
          <span className="inline-flex items-center gap-1 rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-600">
            <Check className="h-3 w-3" /> Agree
          </span>
        )}
        {agree === false && (
          <span className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
            <X className="h-3 w-3" /> Disagree
          </span>
        )}
      </div>

      {state ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-zinc-500">Predicted state</p>
            <p className="mt-1 text-lg font-medium text-zinc-900">{state}</p>
          </div>

          <div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Confidence</span>
              <span className="font-medium text-zinc-900">{pct}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-200">
              <div className="h-1.5 rounded-full bg-zinc-700" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {reasons.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-500">Reasoning</p>
              <ul className="space-y-2">
                {reasons.map((r, i) => {
                  const positive = isPositiveEvidence(r);
                  const negative = isNegativeEvidence(r);
                  const text = stripEvidencePrefix(r);
                  return (
                    <li key={i} className="flex gap-2 text-sm text-zinc-700">
                      {positive && <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />}
                      {negative && <X className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />}
                      {!positive && !negative && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />}
                      <span>{text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Run analysis to see prediction.</p>
      )}
    </Panel>
  );
}

export function PredictionCards({ result }: PredictionCardsProps) {
  const agree = result ? result.rule_engine.state === result.llm_engine.state : null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-zinc-900">Analyzer output</h2>
        {result && (
          <p className="text-sm text-zinc-500">
            {agree
              ? "Both analyzers agree."
              : `Disagreement: ${result.rule_engine.state} vs ${result.llm_engine.state}`}
          </p>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <PredictionCard
          title="Rule engine"
          subtitle="Deterministic thresholds"
          state={result?.rule_engine.state}
          confidence={result?.rule_engine.confidence}
          reasons={result?.rule_engine.reason ?? []}
          agree={result ? agree : null}
        />
        <PredictionCard
          title="Nimotron LLM"
          subtitle="NVIDIA Nemotron judge"
          state={result?.llm_engine.state}
          confidence={result?.llm_engine.confidence}
          reasons={result?.llm_engine.reason ?? []}
          agree={result ? agree : null}
        />
      </div>
    </section>
  );
}
