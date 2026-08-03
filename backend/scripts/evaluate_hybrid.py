"""Evaluate rule engine and LLM judge on synthetic labelled traces."""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from collections import Counter
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.services.analyzer_rule import rule_based_prediction
from app.services.llm_judge import llm_based_prediction_detailed
from app.services.metrics import compute_metrics
from scripts.synthetic_traces import GENERATORS, generate_corpus

LABELS = list(GENERATORS.keys())
DEFAULT_OUT = BACKEND_DIR.parent / "paper" / "hybrid_evaluation_results.json"


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
        f1 = (
            2 * precision * recall / (precision + recall)
            if (precision + recall)
            else 0.0
        )
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


def _load_checkpoint(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {item["id"]: item for item in data.get("items", [])}


async def _evaluate_one(
    index: int,
    label: str,
    trace,
    semaphore: asyncio.Semaphore,
) -> dict:
    async with semaphore:
        metrics = compute_metrics(trace)
        rule = rule_based_prediction(metrics)
        llm, source = await llm_based_prediction_detailed(trace, metrics)
        return {
            "id": f"{label}_{index}",
            "true_label": label,
            "rule_state": rule.state,
            "rule_confidence": rule.confidence,
            "llm_state": llm.state,
            "llm_confidence": llm.confidence,
            "llm_source": source,
            "agree": rule.state == llm.state,
            "rule_correct": rule.state == label,
            "llm_correct": llm.state == label,
            "metrics": {
                "progress_score": metrics.get("progress_score"),
                "waiting_action_count": metrics.get("waiting_action_count"),
                "consecutive_repeated_actions": metrics.get(
                    "consecutive_repeated_actions"
                ),
                "runtime_seconds": metrics.get("runtime_seconds"),
                "failed_steps": metrics.get("failed_steps"),
            },
        }


async def evaluate(
    per_class: int = 20,
    concurrency: int = 3,
    checkpoint_path: Path | None = None,
) -> dict:
    corpus = generate_corpus(per_class=per_class)
    checkpoint_path = checkpoint_path or DEFAULT_OUT
    cached = _load_checkpoint(checkpoint_path)
    semaphore = asyncio.Semaphore(concurrency)

    tasks = []
    for index, (label, trace) in enumerate(corpus):
        item_id = f"{label}_{index}"
        # Stable id by position in shuffled corpus; prefer cache by true label+index
        # in corpus order.
        cache_key = f"idx_{index}"
        if cache_key in cached and cached[cache_key].get("true_label") == label:
            continue
        tasks.append((index, label, trace, cache_key))

    results_by_key = {
        k: v
        for k, v in cached.items()
        if k.startswith("idx_")
    }

    async def run_and_store(index: int, label: str, trace, cache_key: str) -> None:
        item = await _evaluate_one(index, label, trace, semaphore)
        item["id"] = cache_key
        results_by_key[cache_key] = item
        # Persist after each call so long runs can resume.
        _write_partial(checkpoint_path, results_by_key)
        print(
            f"[{len(results_by_key)}/{len(corpus)}] {label}: "
            f"rule={item['rule_state']} llm={item['llm_state']} "
            f"src={item['llm_source']} agree={item['agree']}",
            flush=True,
        )

    await asyncio.gather(
        *(run_and_store(i, lab, tr, key) for i, lab, tr, key in tasks)
    )

    # Rebuild ordered items from corpus indices.
    items = []
    for index, (label, _trace) in enumerate(corpus):
        key = f"idx_{index}"
        if key not in results_by_key:
            raise RuntimeError(f"Missing result for {key}")
        items.append(results_by_key[key])

    return _summarize(items)


def _write_partial(path: Path, results_by_key: dict[str, dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "status": "partial",
        "items": [results_by_key[k] for k in sorted(results_by_key.keys())],
    }
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _summarize(items: list[dict]) -> dict:
    y_true = [i["true_label"] for i in items]
    y_rule = [i["rule_state"] for i in items]
    y_llm = [i["llm_state"] for i in items]

    agree_n = sum(1 for i in items if i["agree"])
    both_correct = sum(1 for i in items if i["rule_correct"] and i["llm_correct"])
    rule_only = sum(1 for i in items if i["rule_correct"] and not i["llm_correct"])
    llm_only = sum(1 for i in items if i["llm_correct"] and not i["rule_correct"])
    both_wrong = sum(
        1 for i in items if not i["rule_correct"] and not i["llm_correct"]
    )

    disagreements = [
        {
            "true_label": i["true_label"],
            "rule_state": i["rule_state"],
            "llm_state": i["llm_state"],
            "rule_correct": i["rule_correct"],
            "llm_correct": i["llm_correct"],
            "llm_source": i["llm_source"],
        }
        for i in items
        if not i["agree"]
    ]

    disagreement_when_hard = Counter(
        i["true_label"] for i in items if not i["agree"]
    )

    source_counts = Counter(i["llm_source"] for i in items)

    # Accuracy conditional on agreement
    agree_items = [i for i in items if i["agree"]]
    disagree_items = [i for i in items if not i["agree"]]
    agree_accuracy = (
        round(
            sum(1 for i in agree_items if i["rule_correct"]) / len(agree_items),
            3,
        )
        if agree_items
        else 0.0
    )
    disagree_rule_acc = (
        round(
            sum(1 for i in disagree_items if i["rule_correct"]) / len(disagree_items),
            3,
        )
        if disagree_items
        else 0.0
    )
    disagree_llm_acc = (
        round(
            sum(1 for i in disagree_items if i["llm_correct"]) / len(disagree_items),
            3,
        )
        if disagree_items
        else 0.0
    )

    return {
        "status": "complete",
        "labels": LABELS,
        "n": len(items),
        "rule": _metrics(y_true, y_rule),
        "llm": _metrics(y_true, y_llm),
        "agreement": {
            "count": agree_n,
            "rate": round(agree_n / len(items), 3) if items else 0.0,
            "accuracy_when_agree": agree_accuracy,
            "rule_accuracy_when_disagree": disagree_rule_acc,
            "llm_accuracy_when_disagree": disagree_llm_acc,
        },
        "correctness_breakdown": {
            "both_correct": both_correct,
            "rule_only_correct": rule_only,
            "llm_only_correct": llm_only,
            "both_wrong": both_wrong,
        },
        "llm_source_counts": dict(source_counts),
        "disagreement_by_true_label": dict(disagreement_when_hard),
        "disagreements": disagreements,
        "items": items,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--per-class", type=int, default=20)
    parser.add_argument("--concurrency", type=int, default=3)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    results = asyncio.run(
        evaluate(
            per_class=args.per_class,
            concurrency=args.concurrency,
            checkpoint_path=args.out,
        )
    )
    args.out.write_text(json.dumps(results, indent=2), encoding="utf-8")
    summary = {
        "rule": results["rule"],
        "llm": results["llm"],
        "agreement": results["agreement"],
        "correctness_breakdown": results["correctness_breakdown"],
        "llm_source_counts": results["llm_source_counts"],
        "disagreement_by_true_label": results["disagreement_by_true_label"],
    }
    print(json.dumps(summary, indent=2))
    print(f"\nWrote {args.out}")


if __name__ == "__main__":
    main()
