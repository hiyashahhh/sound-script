"""Retrieval evaluation. Run from backend/: python -m app.eval.run_eval  (prints measured Precision@k and Recall@k)."""
import json, pathlib
from ..rag.ingest import load_chunks
from ..rag.retriever import retrieve

def evaluate(k: int = 3):
    queries = json.loads((pathlib.Path(__file__).parent / "queries.json").read_text())
    total = {}
    for c in load_chunks():
        total[c["topic"]] = total.get(c["topic"], 0) + 1
    rows = []
    for q in queries:
        hits = sum(1 for r in retrieve(q["query"], k) if r["topic"] == q["topic"])
        rows.append({"query": q["query"], "precision": hits / k, "recall": hits / total[q["topic"]]})
    n = len(rows)
    return {"k": k, "precision@k": sum(r["precision"] for r in rows) / n,
            "recall@k": sum(r["recall"] for r in rows) / n, "rows": rows}

if __name__ == "__main__":
    print(json.dumps(evaluate(), indent=2))
