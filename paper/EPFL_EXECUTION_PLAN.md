# EPFL execution plan (committed)

## Freeze the research question (not every method detail)

**Research question (stable):**
Can hybrid rule-based and LLM-based behavioral inference improve the diagnosis of
autonomous AI agent execution traces, and can agreement/disagreement serve as an
interpretable confidence signal?

If evaluation shows a state is poorly defined, or disagreement is less useful than
expected, **update the method** and discuss it honestly. Do not ignore evidence.

**Do freeze:** research question, claim scope, no product feature creep.  
**Can change:** features, thresholds, state definitions, figures — if evidence requires it.

## Hypotheses

**H1:** A hybrid rule+LLM behavioral inference framework achieves higher behavioral state
prediction performance than either rule-based or LLM-only inference on the evaluation
dataset.

**H2:** Agreement between rule-based and LLM inference serves as an interpretable
confidence indicator, while disagreement identifies cases that warrant human inspection.

## Time split (until 31 Aug)

- **20%** implementation (experiments only)
- **40%** experiments and evaluation
- **40%** paper writing, figures, revision

## Stages

### Stage 1 — Framing (mostly done)
- [x] Problem statement
- [x] Research question
- [x] H1/H2
- [x] Contributions
- [x] Related work outline (`paper/llmsheriff_ieee.tex`)

### Stage 2 — Evidence (NOW)
- [x] E01 rule baseline documented
- [x] E02 local hybrid (100) documented
- [x] E03 AWS smoke (25) documented
- [x] **E04 full AWS hybrid (100)** — done + in repo
- [x] Experiment log: `docs/experiment_log.md`
- [x] Dataset description: `docs/dataset.md`
- [x] Error analysis examples: `docs/error_analysis_examples.md`
- [x] Sync paper tables to **E04** numbers (agree acc 0.984, not 1.00)

H2 operationalization: agreement = identical predicted states; disagreement = different
states. Report accuracy on each subset vs synthetic gold + disagreement-by-class.

### Stage 3 — Paper from evidence
- [ ] Revise discussion/claims to match final numbers
- [ ] Strengthen related work citations as needed
- [ ] Every figure/table from Stage 2

### Stage 4 — Review week
Reviewer checklist (answer each in ≤1 paragraph):
1. What is the problem?
2. Why aren't existing tools enough?
3. What exactly is new?
4. How was it evaluated?
5. What are the limitations?

Also: every claim has evidence; novelty clear in abstract+intro; anonymized PDF.

## Claim discipline
Useful and promising under the evaluation performed — not “best observability system.”

## After EPFL (later)
Real traces, human κ, stronger baselines, larger benchmark.
