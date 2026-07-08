import { AnalyzeResponse, RecentRun, RunDetail } from "@/types/intent";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type AnalyzePayload = {
  task_id: string;
  user_prompt: string;
  current_goal: string;
  trace: unknown[];
};

export async function analyzeIntent(payload: AnalyzePayload): Promise<AnalyzeResponse> {
  const response = await fetch(`${apiBase}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Analyze request failed (${response.status}): ${body}`);
  }

  return response.json();
}

export async function fetchRecentRuns(): Promise<RecentRun[]> {
  const response = await fetch(`${apiBase}/api/runs`);
  if (!response.ok) {
    throw new Error(`Failed to load runs (${response.status})`);
  }
  return response.json();
}

export async function fetchRunDetail(runId: number): Promise<RunDetail> {
  const response = await fetch(`${apiBase}/api/runs/${runId}`);
  if (!response.ok) {
    throw new Error(`Failed to load run details (${response.status})`);
  }
  return response.json();
}
