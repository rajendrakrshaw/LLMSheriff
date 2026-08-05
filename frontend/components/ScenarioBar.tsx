import { SCENARIOS, Scenario } from "@/lib/scenarios";
import { Panel, SectionTitle } from "@/components/layout";

type ScenarioBarProps = {
  onLoad: (scenario: Scenario) => void;
  active: string | null;
};

export function ScenarioBar({ onLoad, active }: ScenarioBarProps) {
  return (
    <Panel>
      <SectionTitle
        title="Preset scenarios"
        description="Load a representative execution trace for analysis."
      />
      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onLoad(s)}
            title={s.description}
            className={`rounded border px-3 py-1.5 text-sm transition-colors ${
              active === s.label
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </Panel>
  );
}
