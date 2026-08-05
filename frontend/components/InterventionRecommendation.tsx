import { AnalyzeResponse } from "@/types/intent";
import { AlertTriangle, CheckCircle2, Eye } from "lucide-react";
import { Panel, SectionTitle } from "@/components/layout";

type InterventionRecommendationProps = {
  result: AnalyzeResponse | null;
};

const LEVEL_CONFIG = {
  none: { Icon: CheckCircle2, className: "text-green-700" },
  monitor: { Icon: Eye, className: "text-amber-700" },
  intervene: { Icon: AlertTriangle, className: "text-red-700" }
};

export function InterventionRecommendation({ result }: InterventionRecommendationProps) {
  if (!result) {
    return (
      <Panel>
        <SectionTitle title="Intervention recommendation" />
        <p className="text-sm text-zinc-500">Run analysis to see a recommendation.</p>
      </Panel>
    );
  }

  const rec = result.recommendation;
  const { Icon, className } = LEVEL_CONFIG[rec.level];

  return (
    <Panel>
      <SectionTitle title="Intervention recommendation" />
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 shrink-0 ${className}`} />
        <div className="flex-1">
          <p className="font-medium text-zinc-900">{rec.title}</p>
          <ul className="mt-3 space-y-1.5">
            {rec.reasons.map((reason, i) => (
              <li key={i} className="text-sm text-zinc-600">
                {reason}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-zinc-400">
            Heuristic recommendation for research demonstration only.
          </p>
        </div>
      </div>
    </Panel>
  );
}
