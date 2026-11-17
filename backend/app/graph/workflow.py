"""LangGraph workflow: analyse -> prepare_query -> retrieve -> generate -> validate -> (retry | finalize)."""
import json, pathlib, re, time
from typing import Callable, List, Optional, TypedDict
from langgraph.graph import END, StateGraph
from .llm import LLMUnavailable, claude

MAX_RETRIES = 2
REQUIRED = ["summary", "purpose", "mood", "intensity", "instrumentation", "style", "tempo", "texture",
            "cueIn", "cueOut", "transition", "silenceNotes", "durationSec", "explanation", "source_ids"]
LOG = pathlib.Path(__file__).resolve().parents[2] / "logs" / "traces.jsonl"
SYSTEM = ("You are a film-music spotting assistant. Use ONLY the numbered reference passages for scoring "
          "claims and cite their ids in source_ids. Reply with one JSON object and nothing else, with keys: "
          + ", ".join(REQUIRED) + ". intensity is 1-10, durationSec is an integer, source_ids is a list of passage ids.")

class State(TypedDict, total=False):
    scene_text: str; genre: str; heading: str; query: str; k: int
    passages: List[dict]; draft: Optional[dict]; issues: List[str]
    attempts: int; trace: List[dict]; status: str; error: Optional[str]

def validate(draft: Optional[dict], passages: List[dict]) -> List[str]:
    """Pure completeness + grounding check. Returns a list of issues (empty means valid)."""
    if not isinstance(draft, dict):
        return ["response was not valid JSON"]
    issues = [f"missing field: {f}" for f in REQUIRED if draft.get(f) in (None, "", [])]
    if isinstance(draft.get("intensity"), (int, float)) and not 1 <= draft["intensity"] <= 10:
        issues.append("intensity must be 1-10")
    valid_ids = {p["id"] for p in passages}
    cited = draft.get("source_ids") or []
    if not isinstance(cited, list) or not set(cited) <= valid_ids:
        issues.append("source_ids cite passages that were not retrieved")
    return issues

def parse_json(text: str) -> Optional[dict]:
    try:
        return json.loads(re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip())
    except (json.JSONDecodeError, TypeError):
        return None

def build_graph(retrieve_fn: Callable, llm_fn: Callable = claude):
    def log(s, node, **info):
        return s.get("trace", []) + [{"node": node, "t": round(time.time(), 2), **info}]

    def analyse(s):
        text = s["scene_text"].strip()
        heading = text.splitlines()[0][:80] if text else "Untitled scene"
        return {"heading": heading, "attempts": 0, "k": 4, "trace": log(s, "analyse", heading=heading)}

    def prepare_query(s):
        broaden = s.get("attempts", 0) > 0
        q = f"film score {s['genre']} {s['scene_text'][:400]}" if not broaden else \
            f"film scoring techniques mood instrumentation tension emotion {s['scene_text'][:200]}"
        k = 4 + (3 if broaden else 0)
        return {"query": q, "k": k, "trace": log(s, "prepare_query", query=q[:120], k=k)}

    def retrieve(s):
        passages = retrieve_fn(s["query"], s["k"])
        return {"passages": passages, "trace": log(s, "retrieve", ids=[p["id"] for p in passages])}

    def generate(s):
        refs = "\n".join(f"[{p['id']}] ({p['title']}) {p['text']}" for p in s["passages"])
        feedback = f"\nFix these problems from your last attempt: {s['issues']}" if s.get("issues") else ""
        user = f"Genre: {s['genre']}\nScene:\n{s['scene_text']}\n\nReference passages:\n{refs}{feedback}"
        try:
            draft = parse_json(llm_fn(SYSTEM, user))
        except LLMUnavailable as e:
            return {"error": str(e), "draft": None, "trace": log(s, "generate", error=str(e))}
        return {"draft": draft, "trace": log(s, "generate", ok=draft is not None)}

    def validate_node(s):
        issues = ["no passages retrieved: insufficient evidence"] if not s["passages"] else validate(s["draft"], s["passages"])
        return {"issues": [] if s.get("error") else issues, "trace": log(s, "validate", issues=issues)}

    def bump(s):
        return {"attempts": s["attempts"] + 1}

    def route(s):
        if s.get("error"): return "fail"
        if not s["issues"]: return "done"
        return "retry" if s["attempts"] < MAX_RETRIES else "give_up"

    def finalize(s):
        status = "error" if s.get("error") else ("ok" if not s["issues"] else "degraded")
        out = {"status": status, "trace": log(s, "finalize", status=status)}
        LOG.parent.mkdir(exist_ok=True)
        with LOG.open("a") as f:
            f.write(json.dumps({"heading": s["heading"], **out, "attempts": s["attempts"]}) + "\n")
        return out

    g = StateGraph(State)
    for name, fn in [("analyse", analyse), ("prepare_query", prepare_query), ("retrieve", retrieve),
                     ("generate", generate), ("validate", validate_node), ("bump", bump), ("finalize", finalize)]:
        g.add_node(name, fn)
    g.set_entry_point("analyse")
    for a, b in [("analyse", "prepare_query"), ("prepare_query", "retrieve"), ("retrieve", "generate"),
                 ("generate", "validate"), ("bump", "prepare_query"), ("finalize", END)]:
        g.add_edge(a, b)
    g.add_conditional_edges("validate", route, {"retry": "bump", "done": "finalize", "give_up": "finalize", "fail": "finalize"})
    return g.compile()
