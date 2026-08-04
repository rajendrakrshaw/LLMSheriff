# Annotations

Use the existing kit — do not rebuild forms:

- Study root: `paper/human_study/`
- Rubric: `paper/human_study/RUBRIC.md`
- Traces: `paper/human_study/export/traces_readable/`
- Blank sheets: `annotations_rater_A.csv` / `B` / `C`
- κ script: `backend/scripts/compute_kappa.py`

After returns, save filled CSVs here or overwrite the rater sheets in `paper/human_study/`,
then run κ and write results into `paper/human_study/agreement_results.json`.
