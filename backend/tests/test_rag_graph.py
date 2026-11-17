import json, pytest
from app.rag.ingest import chunk_text, load_chunks
from app.graph.workflow import build_graph, validate, MAX_RETRIES
from app.graph.llm import LLMUnavailable
from app.api.routes import split_scenes

P = [{"id": "tension-0", "title": "T", "topic": "tension", "text": "x", "score": 0.9}]
GOOD = {k: "v" for k in ["summary","purpose","mood","instrumentation","style","tempo","texture","cueIn","cueOut","transition","silenceNotes","explanation"]}
GOOD.update(intensity=7, durationSec=45, source_ids=["tension-0"])
state = lambda: {"scene_text": "INT. HALL - NIGHT\nA door creaks.", "genre": "Horror"}

def test_chunk_overlap():
    c = chunk_text(" ".join(map(str, range(100))), 40, 10)
    assert c[1].split()[0] == "30" and len(c) == 3
def test_chunk_bad_args():
    with pytest.raises(ValueError): chunk_text("a b", 5, 5)
def test_all_kb_docs_have_metadata():
    assert {c["topic"] for c in load_chunks()} >= {"leitmotif", "silence"}
def test_validate_flags_ungrounded():
    assert "source_ids cite passages that were not retrieved" in validate({**GOOD, "source_ids": ["nope"]}, P)
def test_validate_ok(): assert validate(GOOD, P) == []
def test_split_scenes():
    assert len(split_scenes("INT. A - DAY\nText here.\nEXT. B - NIGHT\nMore text.")) == 2

# Test doubles stand in for the retriever and for Gemini so workflow logic is tested deterministically.
def test_graph_success():
    g = build_graph(lambda q, k: P, lambda s, u: json.dumps(GOOD))
    r = g.invoke(state()); assert r["status"] == "ok" and r["attempts"] == 0
def test_graph_retries_then_degrades():
    calls = []
    g = build_graph(lambda q, k: calls.append(k) or P, lambda s, u: "not json")
    r = g.invoke(state())
    assert r["status"] == "degraded" and r["attempts"] == MAX_RETRIES and calls == [4, 7, 7]
def test_graph_insufficient_evidence():
    r = build_graph(lambda q, k: [], lambda s, u: json.dumps(GOOD)).invoke(state())
    assert r["status"] == "degraded" and "insufficient evidence" in r["issues"][0]
def test_graph_llm_unavailable():
    def boom(s, u): raise LLMUnavailable("no key")
    r = build_graph(lambda q, k: P, boom).invoke(state())
    assert r["status"] == "error" and r["error"] == "no key"

def test_retrieval_precision_real_embeddings():
    import os
    pytest.importorskip("faiss"); pytest.importorskip("langchain_google_genai")
    if not os.getenv("GOOGLE_API_KEY"):
        pytest.skip("needs GOOGLE_API_KEY (real Gemini embeddings)")
    from app.eval.run_eval import evaluate
    assert evaluate(3)["precision@k"] > 0.3  # loose floor; the actual measured number comes from run_eval
