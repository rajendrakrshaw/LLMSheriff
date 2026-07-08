import { AnalyzeResponse } from "@/types/intent";
import { Check, X } from "lucide-react";
import { Panel, SectionTitle } from "@/components/ui";
import { isNegativeEvidence, isPositiveEvidence, stripEvidencePrefix } from "@/lib/text";

type EvidencePanelProps = {
  result: AnalyzeResponse | null;
};

export function EvidencePanel({ result }: EvidencePanelProps) {
  if (!result || result.evidence.length === 0) {
    return null;
  }

  return (
    <Panel>
      <SectionTitle
        title="Evidence summary"
        description="Trace-derived signals supporting the behavioral inference."
      />
      <ul className="space-y-2">
        {result.evidence.map((item, i) => {
          const positive = isPositiveEvidence(item);
          const negative = isNegativeEvidence(item);
          const text = stripEvidencePrefix(item);
          return (
            <li key={i} className="flex gap-2 text-sm text-zinc-700">
              {positive && <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />}
              {negative && <X className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />}
              <span>{text}</span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
