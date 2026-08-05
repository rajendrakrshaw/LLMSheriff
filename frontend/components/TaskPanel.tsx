import { Panel, SectionTitle } from "@/components/layout";

type TaskPanelProps = {
  taskId: string;
  taskPrompt: string;
  taskGoal: string;
  traceInput: string;
  loading: boolean;
  error: string;
  statusMessage: string;
  onTaskIdChange: (value: string) => void;
  onTaskPromptChange: (value: string) => void;
  onTaskGoalChange: (value: string) => void;
  onTraceInputChange: (value: string) => void;
  onAnalyze: () => void;
};

const inputClass =
  "w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none";

export function TaskPanel(props: TaskPanelProps) {
  const {
    taskId,
    taskPrompt,
    taskGoal,
    traceInput,
    loading,
    error,
    statusMessage,
    onTaskIdChange,
    onTaskPromptChange,
    onTaskGoalChange,
    onTraceInputChange,
    onAnalyze
  } = props;

  return (
    <section className="grid gap-5 md:grid-cols-2">
      <Panel>
        <SectionTitle title="Task information" />
        <div className="space-y-3">
          <input className={inputClass} value={taskId} onChange={(e) => onTaskIdChange(e.target.value)} placeholder="Task ID" />
          <input className={inputClass} value={taskPrompt} onChange={(e) => onTaskPromptChange(e.target.value)} placeholder="User prompt" />
          <input className={inputClass} value={taskGoal} onChange={(e) => onTaskGoalChange(e.target.value)} placeholder="Current goal" />
          <button
            type="button"
            onClick={onAnalyze}
            disabled={loading}
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Analyzing trace..." : "Analyze Trace Now"}
          </button>
          <p className="text-xs text-zinc-500">
            Use this button for immediate results. Use "Replay Trace & Analyze" below for a step-by-step demo.
          </p>
          {statusMessage ? <p className="text-sm text-emerald-700">{statusMessage}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </Panel>

      <Panel>
        <SectionTitle
          title="Agent execution trace"
          description="Step-by-step record of agent actions."
        />
        <textarea
          className={`${inputClass} min-h-52 font-mono text-xs`}
          value={traceInput}
          onChange={(e) => onTraceInputChange(e.target.value)}
        />
      </Panel>
    </section>
  );
}
