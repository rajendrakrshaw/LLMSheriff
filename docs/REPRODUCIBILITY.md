# Reproducibility guide (LLMSheriff)

## Environment
- Python 3.11+ recommended
- Backend: `backend/` with venv + `pip install -r requirements.txt` (or project deps)
- Nemotron / NVIDIA API key in `backend/.env` (never commit)

## Rule-only eval (E01)
```powershell
cd backend
python scripts/evaluate_synthetic.py
```
Artifact: `paper/evaluation_results.json` (or AWS copy)

## Hybrid eval (E04 primary)
```powershell
cd backend
python scripts/evaluate_hybrid.py --per-class 20 --concurrency 3 --out ../paper/hybrid_evaluation_results_aws.json
```
Archive raw JSON under `results/` before summarizing.

## Human labeling export
```powershell
cd backend
python scripts/export_labeling_set.py
python scripts/compute_kappa.py --annotations ../paper/human_study/annotations_rater_A.csv ../paper/human_study/annotations_rater_B.csv --gold ../paper/human_study/private/gold_labels.json --out ../paper/human_study/agreement_results.json
```

## Paper
- Named: `paper/llmsheriff_ieee.tex`
- Anonymous submit: `paper/llmsheriff_ieee_anonymous.tex`
- Experiment log: `docs/experiment_log.md`
- Evidence matrix: `research/evidence_matrix.md`

## Claim discipline
Useful and promising under the evaluation performed — not “best observability system.”
