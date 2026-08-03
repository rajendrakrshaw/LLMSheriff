"""Compute inter-rater agreement (Cohen's κ / Fleiss' κ) for the human study.

Usage:
  python scripts/compute_kappa.py \\
    --annotations ../paper/human_study/annotations_rater_A.csv \\
                 ../paper/human_study/annotations_rater_B.csv \\
                 ../paper/human_study/annotations_rater_C.csv \\
    --gold ../paper/human_study/private/gold_labels.json \\
    --out ../paper/human_study/agreement_results.json
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import Counter, defaultdict
from itertools import combinations
from pathlib import Path

VALID_STATES = {
    "Planning",
    "Executing",
    "Waiting",
    "Recovering",
    "Stalled",
    "Abandoned",
    "Completed",
    "Failed",
}


def _load_annotations(paths: list[Path]) -> dict[str, dict[str, str]]:
    """Return {trace_id: {annotator_id: state}}."""
    data: dict[str, dict[str, str]] = defaultdict(dict)
    for path in paths:
        with path.open(encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                tid = (row.get("trace_id") or "").strip()
                aid = (row.get("annotator_id") or path.stem).strip()
                state = (row.get("state") or "").strip()
                if not tid or not state:
                    continue
                if state not in VALID_STATES:
                    raise ValueError(f"{path}: invalid state '{state}' for {tid}")
                data[tid][aid] = state
    return dict(data)


def cohens_kappa(y1: list[str], y2: list[str]) -> float:
    if len(y1) != len(y2) or not y1:
        return 0.0
    n = len(y1)
    labels = sorted(set(y1) | set(y2))
    po = sum(a == b for a, b in zip(y1, y2)) / n
    c1 = Counter(y1)
    c2 = Counter(y2)
    pe = sum((c1[lab] / n) * (c2[lab] / n) for lab in labels)
    if pe >= 1.0:
        return 1.0
    return (po - pe) / (1.0 - pe)


def fleiss_kappa(ratings: list[list[str]]) -> float:
    """ratings: list of per-item label lists (one entry per rater)."""
    if not ratings:
        return 0.0
    n_items = len(ratings)
    n_raters = len(ratings[0])
    if any(len(r) != n_raters for r in ratings):
        raise ValueError("Each item must have the same number of raters for Fleiss' κ")

    labels = sorted({lab for row in ratings for lab in row})
    # n_ij matrix
    counts = []
    for row in ratings:
        c = Counter(row)
        counts.append([c.get(lab, 0) for lab in labels])

    # P_i
    p_i = []
    for row in counts:
        s = sum(v * v for v in row)
        p_i.append((s - n_raters) / (n_raters * (n_raters - 1)))
    p_bar = sum(p_i) / n_items

    # p_j
    totals = [sum(counts[i][j] for i in range(n_items)) for j in range(len(labels))]
    p_j = [t / (n_items * n_raters) for t in totals]
    p_e = sum(p * p for p in p_j)
    if p_e >= 1.0:
        return 1.0
    return (p_bar - p_e) / (1.0 - p_e)


def majority_label(votes: list[str]) -> str | None:
    if not votes:
        return None
    counts = Counter(votes)
    top = counts.most_common()
    if len(top) > 1 and top[0][1] == top[1][1]:
        return None  # tie
    return top[0][0]


def accuracy(y_true: list[str], y_pred: list[str]) -> float:
    if not y_true:
        return 0.0
    return sum(a == b for a, b in zip(y_true, y_pred)) / len(y_true)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--annotations", nargs="+", type=Path, required=True)
    parser.add_argument("--gold", type=Path, default=None)
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args()

    ann = _load_annotations(args.annotations)
    if not ann:
        print("No completed annotations found (state column empty?).", file=sys.stderr)
        sys.exit(1)

    # Keep only traces labeled by all provided raters
    annotator_ids = sorted({aid for labels in ann.values() for aid in labels})
    complete_ids = sorted(
        tid for tid, labels in ann.items() if set(labels) >= set(annotator_ids)
    )
    if len(annotator_ids) < 2:
        print("Need at least 2 annotators with filled states.", file=sys.stderr)
        sys.exit(1)
    if not complete_ids:
        print("No traces labeled by all annotators yet.", file=sys.stderr)
        sys.exit(1)

    pairwise = {}
    for a, b in combinations(annotator_ids, 2):
        y1 = [ann[tid][a] for tid in complete_ids]
        y2 = [ann[tid][b] for tid in complete_ids]
        pairwise[f"{a}_vs_{b}"] = {
            "n": len(complete_ids),
            "observed_agreement": round(
                sum(x == y for x, y in zip(y1, y2)) / len(complete_ids), 3
            ),
            "cohens_kappa": round(cohens_kappa(y1, y2), 3),
        }

    fleiss_input = [[ann[tid][aid] for aid in annotator_ids] for tid in complete_ids]
    fleiss = round(fleiss_kappa(fleiss_input), 3)

    result: dict = {
        "n_traces_fully_labeled": len(complete_ids),
        "annotators": annotator_ids,
        "pairwise_cohens_kappa": pairwise,
        "fleiss_kappa": fleiss,
        "interpretation": _interpret(fleiss),
    }

    if args.gold and args.gold.exists():
        gold = json.loads(args.gold.read_text(encoding="utf-8"))["gold"]
        maj = []
        gold_list = []
        for tid in complete_ids:
            if tid not in gold:
                continue
            m = majority_label([ann[tid][aid] for aid in annotator_ids])
            if m is None:
                continue
            maj.append(m)
            gold_list.append(gold[tid])
        result["vs_gold"] = {
            "n_majority_resolved": len(maj),
            "majority_vs_gold_accuracy": round(accuracy(gold_list, maj), 3)
            if maj
            else None,
        }

        # Per-annotator vs gold
        per_ann = {}
        for aid in annotator_ids:
            y_pred = [ann[tid][aid] for tid in complete_ids if tid in gold]
            y_true = [gold[tid] for tid in complete_ids if tid in gold]
            per_ann[aid] = round(accuracy(y_true, y_pred), 3)
        result["annotator_vs_gold_accuracy"] = per_ann

    print(json.dumps(result, indent=2))
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(f"\nWrote {args.out}")


def _interpret(kappa: float) -> str:
    # Landis & Koch (1977) rough guide
    if kappa < 0:
        return "poor (worse than chance)"
    if kappa < 0.20:
        return "slight"
    if kappa < 0.40:
        return "fair"
    if kappa < 0.60:
        return "moderate"
    if kappa < 0.80:
        return "substantial"
    return "almost perfect"


if __name__ == "__main__":
    main()
