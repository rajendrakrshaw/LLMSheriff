import { Panel, SectionTitle } from "@/components/layout";

export function LimitationsPanel() {
  const items = [
    "Uses heuristic thresholds rather than learned models.",
    "Evaluates preset scenarios rather than live autonomous agents.",
    "Behavioral inference is exploratory and not validated at scale.",
    "No formal human evaluation or ground-truth labeling has been conducted.",
    "LLM-based analysis depends on external API availability."
  ];

  return (
    <Panel>
      <SectionTitle title="Prototype limitations" />
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="text-sm text-zinc-600">
            {item}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
