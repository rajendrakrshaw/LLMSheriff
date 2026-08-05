import { RecentRun } from "@/types/intent";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { Panel } from "@/components/layout";

type RunsListProps = {
  runs: RecentRun[];
  onRefresh: () => void;
};

export function RunsList({ runs, onRefresh }: RunsListProps) {
  return (
    <Panel>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-zinc-900">Recent runs</h2>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {runs.length === 0 ? (
        <p className="text-sm text-zinc-500">No runs yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-200">
          {runs.map((run) => (
            <li key={run.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm">
              <Link className="font-medium text-zinc-900 hover:underline" href={`/runs/${run.id}`}>
                Run #{run.id}
              </Link>
              <span className="text-zinc-500">{run.task_id}</span>
              <span className="text-zinc-600">Rule: {run.rule_state}</span>
              <span className="text-zinc-600">LLM: {run.llm_state}</span>
              <span className="text-zinc-500">Progress: {run.progress_score}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
