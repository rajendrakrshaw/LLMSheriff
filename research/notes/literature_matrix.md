# Literature comparison matrix

Fill 1–2 rows/day (5–12 Aug). Focus: Abstract, Intro, Method, Eval, Conclusion.

| Paper / system | Problem | Method | Dataset | Limitation | Relation to LLMSheriff |
| --- | --- | --- | --- | --- | --- |
| LangSmith | Debug LLM apps | Traces, latency, tokens | Product logs | No behavioral wait/intervene states | Observability baseline we sit *above* |
| Langfuse | Open-source LLM observability | Traces + eval hooks | Product logs | Same gap | Same |
| AgentOps | Agent monitoring | Session/tool analytics | Product logs | Progress semantics not primary | Same |
| OpenTelemetry | Distributed tracing | Specs + exporters | Systems | Plumbing, not intent states | Infrastructure under traces |
| Yao et al. ReAct (ICLR 2023) | Tool-using agents | Reason+Act loop | Agent benchmarks | Scaffolding, not runtime diagnosis | Agent behavior we *monitor* |
| Shinn et al. Reflexion (NeurIPS 2023) | Improve agents via reflection | Verbal RL / memory | Agent tasks | Improves agent, not operator triage | Complementary; we diagnose stalls |
| Zheng et al. LLM-as-judge (NeurIPS 2023) | Evaluate chat quality | LLM judges + arenas | MT-Bench etc. | Judges answers, not execution progress | Related to our LLM analyzer role |
| Horkoff et al. GORE survey | Goal modeling in RE | Systematic map | Literature | Not LLM-agent traces | Classical goal framing |
| Dardenne et al. KAOS | Goal-directed reqs | Goal/obstacle models | Specs | Design-time | Inspiration for progress semantics |
| Carberry plan recognition | Infer plans from behavior | Recognition algorithms | Classical AI | Not hybrid rule+LLM on agent traces | Closest classical analogue |
| Leucker & Schallhart RV | Runtime verification | Formal properties | Specs/traces | Temporal logic, not coarse states | Formal cousin; we are pragmatic |
| Chen et al. AI Agent Behavioral Science (arXiv:2506.06366) | Study agents as behavioral entities | Survey / paradigm (observe, intervene, interpret) | Literature synthesis | Conceptual; not a trace monitoring system | High-level framing; LLMSheriff = concrete diagnostic instance on execution traces |
| Cherep et al. ABxLab (ICLR 2026; MIT Media Lab) | Probe agent *choice* under attribute/nudge manipulations | Controlled shopping experiments + open benchmark | Consumer choice / web shopping | Decision bias, not runtime wait/stall/abandon on tool traces | Same “behavioral science of agents” family; different axis (choice vs execution progress) |
| Emergent Mind topic: Behavioral Science of AI Agents | Curated topic overview | Links / summaries hub | N/A | Not a paper; secondary source | Discovery index only — cite primary papers, not the hub |
| AutoGen / LangGraph (fill) | Multi-agent orchestration | Graphs / multi-agent | Demos | Frameworks, not diagnosis layers | Systems that *emit* traces we could monitor |

## Notes discipline
For each new paper, write ≤5 bullets in `notes/` if needed, then **one matrix row**.
No row → reading didn’t help the paper.
