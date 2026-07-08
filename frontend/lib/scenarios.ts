export type Scenario = {
  label: string;
  description: string;
  taskPrompt: string;
  taskGoal: string;
  taskId: string;
  trace: object[];
};

export const SCENARIOS: Scenario[] = [
  {
    label: "Healthy Agent",
    description: "Agent progresses steadily through planning, execution, and completion.",
    taskPrompt: "Build a landing page for a SaaS startup.",
    taskGoal: "Deliver responsive hero and pricing sections.",
    taskId: "scenario_healthy_001",
    trace: [
      { timestamp: "2026-07-08T10:00:00Z", step: "PLANNING", action: "Decompose task into subtasks", duration: 1.1, status: "success", metadata: {} },
      { timestamp: "2026-07-08T10:00:05Z", step: "LLM_CALL", action: "Generate component structure", duration: 2.3, status: "success", metadata: {} },
      { timestamp: "2026-07-08T10:00:10Z", step: "TOOL_CALL", action: "Create HeroSection component", duration: 1.8, status: "success", metadata: {} },
      { timestamp: "2026-07-08T10:00:14Z", step: "TOOL_CALL", action: "Create PricingSection component", duration: 2.1, status: "success", metadata: {} },
      { timestamp: "2026-07-08T10:00:18Z", step: "LLM_CALL", action: "Review and finalize output", duration: 1.4, status: "success", metadata: {} }
    ]
  },
  {
    label: "Looping Agent",
    description: "Agent enters a loop, repeating the same search without progress.",
    taskPrompt: "Find and summarise the latest research on transformer attention.",
    taskGoal: "Return a 5-bullet summary of key findings.",
    taskId: "scenario_looping_001",
    trace: [
      { timestamp: "2026-07-08T10:00:00Z", step: "PLANNING", action: "Identify search strategy", duration: 0.9, status: "success", metadata: {} },
      { timestamp: "2026-07-08T10:00:04Z", step: "TOOL_CALL", action: "Search: transformer attention mechanisms", duration: 2.2, status: "success", metadata: {} },
      { timestamp: "2026-07-08T10:00:10Z", step: "TOOL_CALL", action: "Search: transformer attention mechanisms", duration: 2.3, status: "success", metadata: {} },
      { timestamp: "2026-07-08T10:00:17Z", step: "TOOL_CALL", action: "Search: transformer attention mechanisms", duration: 2.1, status: "success", metadata: {} },
      { timestamp: "2026-07-08T10:00:24Z", step: "TOOL_CALL", action: "Search: transformer attention mechanisms", duration: 2.4, status: "success", metadata: {} },
      { timestamp: "2026-07-08T10:00:31Z", step: "TOOL_CALL", action: "Search: transformer attention mechanisms", duration: 2.2, status: "success", metadata: {} }
    ]
  },
  {
    label: "Recovering Agent",
    description:
      "Initial tool failure, then retry and alternative strategy — agent adapts rather than giving up.",
    taskPrompt: "Scrape product prices from an e-commerce site and export to CSV.",
    taskGoal: "Return a CSV file with product name, price, and availability.",
    taskId: "scenario_recovering_001",
    trace: [
      { timestamp: "2026-07-08T10:00:00Z", step: "PLANNING", action: "Identify scraping strategy", duration: 1.0, status: "success", metadata: {} },
      { timestamp: "2026-07-08T10:00:05Z", step: "TOOL_CALL", action: "Scrape primary product page", duration: 2.8, status: "failed", metadata: { error: "403 forbidden" } },
      { timestamp: "2026-07-08T10:00:12Z", step: "TOOL_CALL", action: "Retry scrape with alternate headers", duration: 2.5, status: "failed", metadata: { error: "403 forbidden" } },
      { timestamp: "2026-07-08T10:00:20Z", step: "LLM_CALL", action: "Select fallback data source strategy", duration: 2.2, status: "success", metadata: {} },
      { timestamp: "2026-07-08T10:00:26Z", step: "TOOL_CALL", action: "Fetch prices via public API endpoint", duration: 1.9, status: "success", metadata: {} },
      { timestamp: "2026-07-08T10:00:32Z", step: "TOOL_CALL", action: "Export results to CSV", duration: 1.4, status: "success", metadata: {} }
    ]
  },
  {
    label: "API Failure",
    description: "Agent encounters repeated tool failures and cannot recover.",
    taskPrompt: "Fetch live stock prices for AAPL and generate a report.",
    taskGoal: "Return current price, 7-day trend, and recommendation.",
    taskId: "scenario_failure_001",
    trace: [
      { timestamp: "2026-07-08T10:00:00Z", step: "PLANNING", action: "Identify data sources", duration: 0.8, status: "success", metadata: {} },
      { timestamp: "2026-07-08T10:00:04Z", step: "TOOL_CALL", action: "Fetch stock API: AAPL", duration: 3.1, status: "failed", metadata: { error: "429 rate limited" } },
      { timestamp: "2026-07-08T10:00:10Z", step: "TOOL_CALL", action: "Retry fetch stock API: AAPL", duration: 3.2, status: "failed", metadata: { error: "429 rate limited" } },
      { timestamp: "2026-07-08T10:00:16Z", step: "TOOL_CALL", action: "Retry fetch stock API: AAPL", duration: 3.0, status: "failed", metadata: { error: "timeout" } },
      { timestamp: "2026-07-08T10:00:22Z", step: "LLM_CALL", action: "Attempt fallback with cached data", duration: 2.1, status: "failed", metadata: { error: "no cache available" } }
    ]
  },
  {
    label: "Waiting Agent",
    description: "Agent has completed its work and is waiting for an external dependency.",
    taskPrompt: "Deploy the application and wait for CI to pass.",
    taskGoal: "Confirm green build and deployment URL.",
    taskId: "scenario_waiting_001",
    trace: [
      { timestamp: "2026-07-08T10:00:00Z", step: "PLANNING", action: "Trigger deployment pipeline", duration: 1.0, status: "success", metadata: {} },
      { timestamp: "2026-07-08T10:00:05Z", step: "TOOL_CALL", action: "Push to remote branch", duration: 1.5, status: "success", metadata: {} },
      { timestamp: "2026-07-08T10:00:10Z", step: "TOOL_CALL", action: "Poll CI status: pending", duration: 4.0, status: "success", metadata: {} },
      { timestamp: "2026-07-08T10:00:25Z", step: "TOOL_CALL", action: "Poll CI status: pending", duration: 4.0, status: "success", metadata: {} },
      { timestamp: "2026-07-08T10:00:40Z", step: "TOOL_CALL", action: "Poll CI status: pending", duration: 4.0, status: "success", metadata: {} }
    ]
  },
  {
    label: "Abandoned Goal",
    description: "Agent was assigned a task but stopped working toward it with no resolution.",
    taskPrompt: "Refactor the authentication module to use JWT tokens.",
    taskGoal: "Replace session-based auth with stateless JWT in all routes.",
    taskId: "scenario_abandoned_001",
    trace: [
      { timestamp: "2026-07-08T10:00:00Z", step: "PLANNING", action: "Analyse existing auth code", duration: 1.2, status: "success", metadata: {} },
      { timestamp: "2026-07-08T10:00:06Z", step: "LLM_CALL", action: "Generate JWT implementation plan", duration: 3.5, status: "success", metadata: {} },
      { timestamp: "2026-07-08T10:00:15Z", step: "TOOL_CALL", action: "Read auth/session.py", duration: 1.1, status: "success", metadata: {} },
      { timestamp: "2026-07-08T10:02:00Z", step: "LLM_CALL", action: "Determine next action", duration: 2.0, status: "success", metadata: {} },
      { timestamp: "2026-07-08T10:05:00Z", step: "LLM_CALL", action: "Determine next action", duration: 2.0, status: "success", metadata: {} }
    ]
  }
];
