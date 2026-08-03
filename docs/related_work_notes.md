# Related work notes (bullets for Stage 3 polish)

## Observability / tracing
- LangSmith, Langfuse, AgentOps: traces, latency, tokens, tool calls, debugging
- OpenTelemetry: distributed tracing plumbing
- Gap: emphasize *what happened*, not wait-vs-intervene behavioral states
- Status: cited in paper

## Agent monitoring / oversight
- ReAct (Yao et al.): tool-using agent scaffolding
- Reflexion (Shinn et al.): reflective repair loops
- Zheng et al.: LLM-as-a-judge evaluation (related to our LLM judge role)
- Gap: progress semantics (still goal-directed?) less central than scaffolding/safety
- Status: cited in paper

## Classical / RE
- GORE / goal modeling (Horkoff et al., Dardenne et al.): goals & obstacles
- Plan/goal recognition (Carberry): infer intentions from behavior
- Runtime verification (Leucker): formal properties at runtime
- Gap: not typically hybrid rule+LLM runtime monitors for LLM-agent traces
- Status: cited in paper

## Positioning sentence (in paper)
Existing work focuses on observability, tracing, agent scaffolding, evaluation, or safety.
Our work focuses on behavioral state inference for runtime diagnosis,
with agreement/disagreement as an interpretable confidence signal.
