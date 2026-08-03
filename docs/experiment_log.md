# LLMSheriff Experiment Log

Research question (stable): Can hybrid rule-based and LLM-based behavioral inference
improve the diagnosis of autonomous AI agent execution traces, and can agreement/disagreement
serve as an interpretable confidence signal?

H1 / H2: see `paper/EPFL_EXECUTION_PLAN.md`

---

## E01 — Rule-engine baseline on synthetic corpus

| Field | Value |
|---|---|
| Date | 2026-07-17 (local); reconfirmed 2026-08-03 on AWS |
| Git | post Waiting-fix / idle-gap features |
| Dataset | Synthetic 100 traces (20×5 classes) — see `docs/dataset.md` |
| Model | N/A (rules only) |
| Prompt | N/A |
| Rule version | Waiting + idle-gap features (`analyzer_rule.py` / `metrics.py`) |
| Command | `python scripts/evaluate_synthetic.py` |
| Metrics | Accuracy **0.96**, Macro-F1 **0.978**; Waiting F1 1.00; Stalled recall 0.80 |
| Artifacts | `paper/evaluation_results.json`; AWS copy `paper/evaluation_results_aws.json` (if pushed) |
| Observations | Waiting→Executing failure mode removed. Remaining errors: Stalled→Executing (4). |
| Decision | Keep rule version frozen for hybrid comparison unless evidence forces change. |

---

## E02 — Hybrid rule + Nemotron on full synthetic corpus (local)

| Field | Value |
|---|---|
| Date | 2026-07-17 |
| Dataset | Same as E01 (100 traces) |
| Model | NVIDIA Nemotron (chat completions) |
| Prompt | State-definition prompt in `llm_judge.py` |
| Rule version | Same as E01 |
| Command | `python scripts/evaluate_hybrid.py --per-class 20 --concurrency 3` |
| Metrics | Rule 0.96; LLM 0.68; Agreement 64/100; Acc when agree **1.00**; Acc when disagree: rule 0.889 / LLM 0.111 |
| Artifacts | `paper/hybrid_evaluation_results.json` |
| Observations | LLM collapses Abandoned→Stalled; catches 4 Stalled misses. 7/100 API fallbacks. |
| H1 note | Rule alone > LLM alone on this dataset; hybrid value is diagnostic (H2), not unconditional accuracy win over rules. |
| H2 note | Operationalized: agree = same state; disagree = different states. Agree subset 100% vs synthetic gold. |
| Decision | Primary evidence for paper H2; report H1 cautiously. |

---

## E03 — Hybrid smoke on AWS workshop (25 traces)

| Field | Value |
|---|---|
| Date | 2026-08-03 |
| Environment | EPFL Europe AI Summer / AWS Workshop Studio VS Code |
| Dataset | Synthetic, `--per-class 5` (25 traces) |
| Model | Nemotron (same prompt) |
| Command | `python scripts/evaluate_hybrid.py --per-class 5 --concurrency 2 --out ../paper/hybrid_eval_aws_smoke.json` |
| Metrics | Rule 0.96; LLM 0.64; Agreement 15/25 (0.60); Acc when agree **1.00** |
| Artifacts | `paper/hybrid_eval_aws_smoke.json` |
| Observations | Reproduces E02 pattern at smaller n. 1 fallback_error. |
| Decision | Proceed to E04 full AWS hybrid (100 traces). |

---

## E04 — Full hybrid on AWS (100 traces) — IN PROGRESS / TODO

| Field | Value |
|---|---|
| Date | 2026-08-03 |
| Command | `python scripts/evaluate_hybrid.py --per-class 20 --concurrency 3 --out ../paper/hybrid_evaluation_results_aws.json` |
| Status | **Run now if not finished; then fill metrics and push** |
| Decision | Primary AWS programme artifact for Stage 2 evidence. |

---

## Template for next runs

```markdown
## E0X — Title

Date:
Git Commit:
Dataset:
Model:
Prompt / Rule Version:
Command:
Metrics:
Artifacts:
Observations:
Decision (method change? paper claim change?):
```
