import { Panel, SectionTitle } from "@/components/layout";

export function ResearchContribution() {
  return (
    <Panel>
      <SectionTitle title="Research contribution" />
      <p className="text-sm leading-relaxed text-zinc-700">
        LLMSheriff explores whether execution traces can be transformed into higher-level
        behavioral states using hybrid symbolic and LLM-based inference. Rather than replacing
        observability tools, it investigates how explainable behavioral monitoring can support
        debugging and human intervention — particularly distinguishing an agent still working
        toward a goal from one that has effectively given up.
      </p>
    </Panel>
  );
}
