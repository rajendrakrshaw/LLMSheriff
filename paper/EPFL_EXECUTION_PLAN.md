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

**H1:** A hybrid framework provides more informative behavioral diagnosis than either
analyzer alone by exposing complementary agreement and disagreement patterns
(not unconditional accuracy dominance over rules).

**H2:** Agreement between rule-based and LLM inference serves as an interpretable
confidence indicator, while disagreement identifies a focused subset of traces that
warrant human inspection.

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
- [x] Revise discussion/claims to match final E04 numbers
- [x] Strengthen related work citations (ReAct, Reflexion, LLM-as-judge, AgentOps)
- [x] State vocabulary one-sentence definitions
- [x] Agree/disagree hero table + disagreement-by-class table
- [x] Full read / claim audit (overclaim words only appear in negations / H1 caution)
- [x] Reviewer checklist answers (`docs/reviewer_checklist.md`)

### Stage 4 — August execution (see `research/AUGUST_CALENDAR.md`)
- [x] Research ops folder (`research/`), evidence matrix, lit matrix, participant sheet
- [ ] Recruit 3–5 annotators (use existing `paper/human_study/` kit)
- [ ] Compute κ if ≥2 sheets returned; update paper if ready
- [ ] 3–5 manuscript readers → `research/reviewer_feedback/`
- [ ] Anonymized PDF → `board@epflaiteam.ch` by **31 Aug 2026**

Also: every claim has evidence (`research/evidence_matrix.md`); novelty clear in abstract+intro.

## Claim discipline
Useful and promising under the evaluation performed — not “best observability system.”

## After EPFL (later)
Real traces, stronger baselines, larger benchmark — if human κ lands before submit, include it.
