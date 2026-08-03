# Human labeling study — LLMSheriff

This folder supports an **inter-rater agreement study** for behavioral state labels.

## Why

Synthetic generator labels are convenient, but a paper needs evidence that humans can
apply the same state vocabulary consistently. We measure **Cohen’s κ** (pairwise) and
**Fleiss’ κ** (3+ raters).

## Quick start

### 1. Export the labeling pack (already runnable)

```powershell
cd backend
.\.venv\Scripts\python.exe scripts/export_labeling_set.py
```

This creates:
- `export/traces_readable/T001.txt` … `T040.txt` — share these with annotators
- `export/manifest.csv` — index (no gold labels)
- `annotations_rater_A.csv` / `B` / `C` — blank sheets
- `private/gold_labels.json` — **do not share** with annotators

### 2. Give each annotator

1. `RUBRIC.md` (this study’s labeling guide)
2. `export/traces_readable/` (all `.txt` files)
3. Their sheet: `annotations_rater_A.csv` (or B / C)

Ask them to fill **state** for every `trace_id`. Optional: `confidence_1_to_5`, `notes`.

### 3. After sheets are filled

```powershell
cd backend
.\.venv\Scripts\python.exe scripts/compute_kappa.py `
  --annotations ../paper/human_study/annotations_rater_A.csv `
               ../paper/human_study/annotations_rater_B.csv `
               ../paper/human_study/annotations_rater_C.csv `
  --gold ../paper/human_study/private/gold_labels.json `
  --out ../paper/human_study/agreement_results.json
```

You need **at least 2 completed sheets**. With 1 sheet, κ cannot be computed.

## Target size

| Item | Value |
|---|---|
| Traces | 40 (8 per class × 5 classes) |
| Annotators | 2–3 |
| Classes | Completed, Recovering, Waiting, Stalled, Abandoned |

## What to put in the paper

- Fleiss’ κ (or mean Cohen’s κ)
- Majority-vote vs generator gold accuracy
- Brief discussion of ambiguous cases (from `notes`)

## Privacy

Keep `private/gold_labels.json` out of shared annotator packs.
