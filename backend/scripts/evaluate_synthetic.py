"""Evaluate rule-engine predictions on synthetic labelled traces."""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.services.analyzer_rule import rule_based_prediction
from app.services.metrics import compute_metrics
from scripts.synthetic_traces import GENERATORS, generate_corpus

LABELS = list(GENERATORS.keys())


def _metrics(y_true: list[str], y_pred: list[str]) -> dict:
    total = len(y_true)
    correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
    per_label: dict[str, dict[str, float]] = {}
    for label in LABELS:
        tp = sum(1 for t, p in zip(y_true, y_pred) if t == label and p == label)
        fp = sum(1 for t, p in zip(y_true, y_pred) if t != label and p == label)
        fn = sum(1 for t, p in zip(y_true, y_pred) if t == label and p != label)
        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
        per_label[label] = {
            "precision": round(precision, 3),
            "recall": round(recall, 3),
            "f1": round(f1, 3),
            "support": sum(1 for t in y_true if t == label),
        }

    macro_f1 = round(sum(v["f1"] for v in per_label.values()) / len(LABELS), 3)
    return {
        "accuracy": round(correct / total, 3) if total else 0.0,
        "macro_f1": macro_f1,
        "per_class": per_label,
        "total": total,
        "correct": correct,
    }


def _confusion(y_true: list[str], y_pred: list[str]) -> dict[str, dict[str, int]]:
    matrix: dict[str, dict[str, int]] = {t: {p: 0 for p in LABELS} for t in LABELS}
    for t, p in zip(y_true, y_pred):
        if p not in matrix[t]:
            matrix[t][p] = 0
        matrix[t][p] += 1
    return matrix


def evaluate(per_class: int = 20) -> dict:
    corpus = generate_corpus(per_class=per_class)
    y_true: list[str] = []
    y_pred: list[str] = []

    for label, trace in corpus:
        metrics = compute_metrics(trace)
        prediction = rule_based_prediction(metrics)
        y_true.append(label)
        y_pred.append(prediction.state)

    return {
        "summary": _metrics(y_true, y_pred),
        "confusion": _confusion(y_true, y_pred),
        "labels": LABELS,
    }


if __name__ == "__main__":
    results = evaluate(per_class=20)
    print(json.dumps(results, indent=2))
