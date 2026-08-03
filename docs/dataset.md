# Dataset description (synthetic evaluation corpus)

## What it is
A **controlled synthetic** corpus of agent-style execution traces for behavioral state
labeling experiments.

## Construction
- Generator: `backend/scripts/synthetic_traces.py`
- Size: **100 traces** (evaluation); labeling pack uses **40** stratified traces
- Classes (20 each for eval): Completed, Recovering, Waiting, Stalled, Abandoned
- Events include timestamp, step, action, duration, status
- Class semantics encoded in generators (e.g. poll loops for Waiting; tight search loops
  for Stalled; long idle gaps for Abandoned; fail-then-recover for Recovering)

## Labels
- Gold labels = generator class identity
- **Not** independent human labels (human study protocol exists; κ pending)
- Rules were **hand-tuned** with knowledge of these generators

## Why it is used
Sufficient to test **feasibility** of H1/H2 under controlled conditions and to debug
feature/rule design reproducibly.

## Limitations (must stay in the paper)
- Not production agent traces
- High rule accuracy partly reflects generator–rule alignment
- Does not establish real-world generalisation
- Label independence not validated by completed multi-rater study in current submission

## Sufficiency for claims
Supports: “useful and promising under this evaluation.”  
Does **not** support: “best observability system” or “production-ready intent monitoring.”
