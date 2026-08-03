# Reviewer checklist answers (draft)

Use these to stress-test the paper before anonymizing. Keep each answer ≤1 paragraph.

## 1. What is the problem?
Autonomous agents produce long traces that show what happened (calls, latency, errors) but not whether the agent is still making meaningful progress toward its goal. Operators therefore struggle to distinguish productive execution, waiting, recovery, stalled loops, and silent abandonment.

## 2. Why aren't existing tools enough?
Observability stacks (LangSmith, Langfuse, AgentOps, OpenTelemetry) reconstruct events and failures. Agent scaffolding and safety work address tool use, reflection, and policy. They do not, by default, emit coarse wait-versus-intervene behavioral states or treat analyzer disagreement as a first-class confidence signal.

## 3. What exactly is new?
A hybrid rule+LLM pipeline that maps traces to eight operational behavioral states and preserves agreement/disagreement as an interpretable confidence/diagnostic cue rather than forcing a single silent winner.

## 4. How was it evaluated?
On a controlled synthetic corpus of 100 labelled traces (20 each of Completed, Recovering, Waiting, Stalled, Abandoned). Primary hybrid run (E04): rules 96% accuracy, LLM 66%, agreement on 64/100 with 98.4% accuracy when they agree; disagreement analysis shows complementary Stalled catches and systematic Abandoned/Completed LLM errors.

## 5. What are the limitations?
Synthetic data; hand-tuned rules; no completed human κ; LLM weaker alone and API-fallback dependent (14/100); agreement is strong but not infallible; no claim of production generalisation.
