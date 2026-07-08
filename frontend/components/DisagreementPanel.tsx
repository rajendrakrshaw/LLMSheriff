import { AnalyzeResponse } from "@/types/intent";
import { Panel, SectionTitle } from "@/components/ui";

type DisagreementPanelProps = {
  result: AnalyzeResponse | null;
};

export function DisagreementPanel({ result }: DisagreementPanelProps) {
  if (!result?.disagreement) {
    return null;
  }

  const d = result.disagreement;

  return (
    <Panel>
      <SectionTitle title="Reason for disagreement" />
      <p className="text-sm text-zinc-700">{d.summary}</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded border border-zinc-200 p-4">
          <p className="text-xs font-medium text-zinc-500">Rule engine</p>
          <p className="mt-2 text-sm text-zinc-700">{d.rule_perspective}</p>
        </div>
        <div className="rounded border border-zinc-200 p-4">
          <p className="text-xs font-medium text-zinc-500">Nimotron</p>
          <p className="mt-2 text-sm text-zinc-700">{d.llm_perspective}</p>
        </div>
      </div>
    </Panel>
  );
}
