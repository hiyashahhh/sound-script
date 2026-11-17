"""API tests with stand-ins for the retriever and Gemini (no network, no API key)."""
import json
import numpy as np
from fastapi.testclient import TestClient
from app.main import app
from app.api import routes
from app.graph.llm import LLMUnavailable
from app.graph.workflow import build_graph

P = [{"id": "tension-0", "title": "Tension", "topic": "tension", "text": "Sustained dissonance.", "score": 0.9}]
GOOD = {k: "v" for k in ["summary", "purpose", "mood", "instrumentation", "style", "tempo", "texture",
                          "cueIn", "cueOut", "transition", "silenceNotes", "explanation"]}
GOOD.update(intensity=7, durationSec=45, source_ids=["tension-0"])
SCRIPT = "INT. HALL - NIGHT\nA door creaks open slowly.\nEXT. ROOF - DAWN\nWind howls over the city."
client = TestClient(app)

def use(llm, retr=lambda q, k: P):
    routes._graph = build_graph(retr, llm)

def test_analyze_returns_scenes_with_cited_sources():
    use(lambda s, u: json.dumps(GOOD))
    r = client.post("/api/analyze", json={"title": "T", "genre": "Horror", "screenplay": SCRIPT})
    assert r.status_code == 200
    scenes = r.json()["scenes"]
    assert len(scenes) == 2 and scenes[0]["status"] == "ok"
    assert scenes[0]["sources"][0]["id"] == "tension-0" and scenes[0]["intensity"] == 7

def test_analyze_503_without_llm():
    def boom(s, u): raise LLMUnavailable("GOOGLE_API_KEY is not set.")
    use(boom)
    r = client.post("/api/analyze", json={"genre": "Drama", "screenplay": SCRIPT})
    assert r.status_code == 503 and "GOOGLE_API_KEY" in r.json()["detail"]

def test_analyze_503_when_embeddings_unavailable():
    def bad(q, k): raise OSError("model download failed")
    use(lambda s, u: json.dumps(GOOD), bad)
    r = client.post("/api/analyze", json={"genre": "Drama", "screenplay": SCRIPT})
    assert r.status_code == 503 and "Retrieval backend unavailable" in r.json()["detail"]

def test_analyze_rejects_short_text():
    assert client.post("/api/analyze", json={"genre": "Drama", "screenplay": "hi"}).status_code == 422

def test_faiss_store_returns_nearest(monkeypatch):
    import app.rag.store as store
    def fake_embed(texts):  # deterministic 384-d vectors so FAISS runs without the real model
        out = []
        for t in texts:
            v = np.zeros(store.DIM, dtype="float32")
            for w in t.lower().split():
                v[hash(w) % store.DIM] += 1
            out.append((v / (np.linalg.norm(v) or 1)).tolist())
        return out
    monkeypatch.setattr(store, "embed", fake_embed)
    chunks = [{"id": "a-0", "text": "tremolo strings dissonance", "topic": "tension"},
              {"id": "b-0", "text": "warm solo cello love", "topic": "emotion"}]
    fs = store.FaissStore(chunks)
    assert fs.search(fake_embed(["dissonance strings"])[0], 1)[0]["id"] == "a-0"
