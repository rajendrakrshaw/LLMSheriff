# Related work notes (bullets for Stage 3 polish)

## Observability / tracing
- LangSmith, Langfuse, AgentOps: traces, latency, tokens, tool calls, debugging
- OpenTelemetry: distributed tracing plumbing
- Gap: emphasize *what happened*, not wait-vs-intervene behavioral states

## Agent monitoring / oversight
- Safety: unsafe tools, jailbreaks, policy filters
- Provenance / AgentTrace-style structured logs: accountability, debugging
- Gap: progress semantics (still goal-directed?) less central than safety/provenance

## Classical / RE
- GORE / goal modeling (Horkoff et al., Dardenne et al.): goals & obstacles
- Plan/goal recognition (Carberry): infer intentions from behavior
- Runtime verification (Leucker): formal properties at runtime
- Gap: not typically hybrid rule+LLM runtime monitors for LLM-agent traces

## Positioning sentence (use in paper)
Existing work focuses on observability, tracing, evaluation, or safety.
Our work focuses on behavioral state inference for runtime diagnosis,
with agreement/disagreement as an interpretable confidence signal.
