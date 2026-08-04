import { AnalyzeResponse, RecentRun, RunDetail } from "@/types/intent";

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://llmsheriff-api.onrender.com";

type AnalyzePayload = {
  task_id: string;
  user_prompt: string;
  current_goal: string;
  trace: unknown[];
};

export type StudyTrace = {
  trace_id: string;
  text: string;
};

export type StudyTracesResponse = {
  states: string[];
  traces: StudyTrace[];
  count: number;
};

export type StudyAnnotationItem = {
  trace_id: string;
  state: string;
  confidence?: number | null;
  notes?: string;
};

export type StudyAnnotatorProfile = {
  session_id: string;
  annotator_name: string;
  annotator_email?: string;
  annotator_profession?: string;
  annotator_linkedin?: string;
  annotations: StudyAnnotationItem[];
};

async function fetchWithTimeout(url: string, init?: RequestInit, ms = 25000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

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

export async function fetchStudyTraces(): Promise<StudyTracesResponse> {
  const response = await fetchWithTimeout(`${apiBase}/api/study/traces`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to load study traces (${response.status}): ${body}`);
  }
  return response.json();
}

export async function fetchStudyRubric(): Promise<string> {
  try {
    const response = await fetchWithTimeout(`${apiBase}/api/study/rubric`, undefined, 15000);
    if (!response.ok) {
      return "";
    }
    return response.text();
  } catch {
    return "";
  }
}

export async function submitStudyAnnotations(
  payload: StudyAnnotatorProfile
): Promise<{ saved: number; session_id: string }> {
  const response = await fetchWithTimeout(`${apiBase}/api/study/annotations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to save annotations (${response.status}): ${body}`);
  }
  return response.json();
}
