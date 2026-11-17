import re, uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ..graph.llm import LLMUnavailable
from ..graph.workflow import build_graph
from ..rag.retriever import retrieve

router = APIRouter(prefix="/api")
_graph = None
def graph():
    global _graph
    if _graph is None:
        _graph = build_graph(retrieve)
    return _graph

class AnalyzeRequest(BaseModel):
    title: str = ""
    genre: str = "Drama"
    screenplay: str = Field(min_length=20, max_length=60000)

def split_scenes(text: str):
    parts = re.split(r"(?m)^(?=(?:INT|EXT|I/E|INT\./EXT)[\. ])", text)
    parts = [p.strip() for p in parts if p.strip()]
    return parts if len(parts) > 1 else [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]

@router.get("/retrieve")
def retrieve_debug(q: str, k: int = 4):
    return {"query": q, "results": retrieve(q, k)}

@router.post("/analyze")
def analyze(req: AnalyzeRequest):
    scenes = []
    for text in split_scenes(req.screenplay)[:30]:
        try:
            s = graph().invoke({"scene_text": text, "genre": req.genre})
        except LLMUnavailable as e:
            raise HTTPException(503, str(e)) from e
        except (ImportError, OSError) as e:  # missing package, or the Gemini embedding call failed
            raise HTTPException(503, f"Retrieval backend unavailable: {e}") from e
        if s["status"] == "error":
            raise HTTPException(503, s["error"])
        d = s.get("draft") or {}
        cited = [p for p in s["passages"] if p["id"] in (d.get("source_ids") or [])]
        scenes.append({
            "id": str(uuid.uuid4()), "heading": s["heading"], **{k: d.get(k, "") for k in
            ["summary", "purpose", "mood", "instrumentation", "style", "tempo", "texture", "cueIn", "cueOut",
             "transition", "silenceNotes", "explanation"]},
            "intensity": d.get("intensity", 5), "durationSec": d.get("durationSec", 60),
            "sources": [{"id": p["id"], "title": p["title"], "topic": p["topic"], "excerpt": p["text"], "score": p["score"]} for p in cited],
            "status": s["status"], "issues": s["issues"], "attempts": s["attempts"], "trace": s["trace"],
            "retrieved": [{"id": p["id"], "title": p["title"], "score": p["score"]} for p in s["passages"]]})
    return {"scenes": scenes}
