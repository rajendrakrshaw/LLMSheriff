# Evidence matrix (claim → support)

Update when the paper changes. Every row must stay true until submission.

| Claim in paper | Evidence | Status |
| --- | --- | --- |
| Observability shows events, not progress semantics | Intro + Related Work (LangSmith/Langfuse/AgentOps/OTel) | OK |
| Eight operational behavioral states are defined | Method → State Vocabulary | OK |
| Hybrid = rules + LLM in parallel; disagreement preserved | Method → Agreement Logic; Fig. overview | OK |
| No public behavioral-state benchmark → synthetic corpus | Evaluation → Dataset (why synthetic + generators) | OK |
| Rules achieve 96% / F1 0.978 on synthetic eval | Table metrics (E01/E04 rule) | OK |
| Residual rule errors are Stalled→Executing (n=4) | Table confusion | OK |
| LLM alone weaker (66% E04) | Table hybrid | OK |
| H1: hybrid is *diagnostic*, not accuracy > rules | H1 rewrite + Table hybrid + Discussion | OK |
| Agreement is a confidence signal (98.4% when agree) | Table agree (H2 hero) | OK |
| Disagreement isolates a 36% review queue | Table inspect | OK |
| Review queue holds 75% of rule errors + all LLM-only corrects | Table inspect | OK |
| Disagreement patterns (Abandoned/Completed/Stalled/Waiting) | Table disagree_class + `docs/error_analysis_examples.md` | OK |
| Limitations: synthetic, hand-tuned, fallbacks, no κ yet | Limitations section | OK until human study lands |
| Human κ validates state vocabulary | `paper/human_study/` → fill after annotators | PENDING |

## Primary artifacts
- `results/E04_hybrid_aws_raw.json`
- `docs/experiment_log.md`
- `docs/error_analysis_examples.md`
- `paper/llmsheriff_ieee.tex`
