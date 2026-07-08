import { Panel } from "@/components/ui";

type MetricItem = {
  label: string;
  value: string;
};

type MetricsGridProps = {
  metrics: MetricItem[];
};

export function MetricsGrid({ metrics }: MetricsGridProps) {
  if (metrics.length === 0) {
    return (
      <Panel>
        <p className="text-sm text-zinc-500">Run analysis to see metrics.</p>
      </Panel>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((metric) => (
        <Panel key={metric.label} className="p-4">
          <p className="text-xs text-zinc-500">{metric.label}</p>
          <p className="mt-1 text-xl font-medium text-zinc-900">{metric.value}</p>
        </Panel>
      ))}
    </div>
  );
}
