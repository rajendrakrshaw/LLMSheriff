# Error analysis examples (from E04 AWS hybrid, n=100)

Primary artifact: `results/E04_hybrid_aws_raw.json`  
(also mirrored at `paper/hybrid_evaluation_results_aws.json`)

Use these bullets in the paper Discussion / H2 section. Do not invent new examples.

## Headline disagreement patterns

| n | true | rule | llm | rule correct? | llm correct? |
|---|---|---|---|---|---|
| 20 | Abandoned | Abandoned | Stalled | yes | no |
| 11 | Completed | Completed | Executing | yes | no |
| 3 | Stalled | Executing | Stalled | no | yes |
| 2 | Waiting | Waiting | Executing | yes | no |

Disagreement total: 36/100 (rate 0.64 agree).

## Example type 1 — LLM corrects rules (H2 positive)

- **Pattern:** true=Stalled, rule=Executing, llm=Stalled (n=3)
- **Why it matters:** On borderline stall loops, rules under-fire (progress score not low enough); LLM recovers the Stalled label.
- **Paper use:** Show disagreement can surface complementary strengths, not only noise.

## Example type 2 — LLM systematic fail

- **Pattern:** true=Abandoned, rule=Abandoned, llm=Stalled (n=20)
- **Why it matters:** Entire Abandoned class is collapsed into Stalled by the LLM on this corpus.
- **Paper use:** Disagreement flags the case for humans, but the LLM label itself is often wrong; rules remain the better single predictor here.

## Example type 3 — LLM soft miss on Completed

- **Pattern:** true=Completed, rule=Completed, llm=Executing (n=11)
- **Why it matters:** LLM under-recognizes terminal success and stays in an in-progress state.
- **Paper use:** Another high-volume disagreement class that is rule-correct / LLM-wrong.

## Example type 4 — Minor Waiting miss

- **Pattern:** true=Waiting, rule=Waiting, llm=Executing (n=2)
- **Why it matters:** Rare; rules already encode poll/idle-gap features that the LLM sometimes ignores.

## Correctness breakdown (E04)

- both correct: 63
- rule only: 33
- llm only: 3
- both wrong: 1

## Agreement vs gold (E04) — update paper numbers

| Subset | n | Accuracy |
|---|---|---|
| Agree | 64 | **0.984** (not 1.00) |
| Disagree — rule | 36 | 0.917 |
| Disagree — LLM | 36 | 0.083 |

Note vs local E02: E02 had agree accuracy 1.00; E04 has 0.984 and 1 both-wrong. Prefer **E04** as the AWS programme primary table, or report both and say they are consistent in pattern.

## API reliability note

- llm: 86, fallback_error: 13, fallback_parse: 1
- Higher fallback rate than E02 (7) — mention in Limitations.
