export type Prediction = {
  state: string;
  confidence: number;
  reason: string[];
};

export type Recommendation = {
  level: "none" | "monitor" | "intervene";
  title: string;
  reasons: string[];
};

export type DisagreementAnalysis = {
  summary: string;
  rule_perspective: string;
  llm_perspective: string;
};

export type AnalyzeResponse = {
  task_id: string;
  run_id: number | null;
  metrics: Record<string, number>;
  evidence: string[];
  rule_engine: Prediction;
  llm_engine: Prediction;
  recommendation: Recommendation;
  disagreement: DisagreementAnalysis | null;
};

export type RecentRun = {
  id: number;
  task_id: string;
  created_at: string;
  rule_state: string;
  llm_state: string;
  progress_score: number;
};

export type RunEvent = {
  id: number;
  timestamp: string;
  step: string;
  action: string;
  duration: number;
  status: string;
};

export type RunDetail = {
  id: number;
  task_id: string;
  user_prompt: string;
  current_goal: string;
  created_at: string;
  runtime_seconds: number;
  progress_score: number;
  rule_state: string;
  rule_confidence: number;
  llm_state: string;
  llm_confidence: number;
  events: RunEvent[];
};

export type TraceEventInput = {
  timestamp: string;
  step: string;
  action: string;
  duration: number;
  status: string;
  metadata?: Record<string, unknown>;
};
