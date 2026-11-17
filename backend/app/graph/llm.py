"""Gemini wrapper. Keeps the old `claude()` name as an alias so nothing else needs to change."""
import os

from langchain_core.messages import HumanMessage, SystemMessage

DEFAULT_MODEL = "gemini-3.5-flash-lite"  # free-tier model; override with GEMINI_MODEL in .env


class LLMUnavailable(Exception):
    """Raised when Gemini cannot be used (no key, bad key, quota exhausted, network error)."""


def get_llm():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise LLMUnavailable("GOOGLE_API_KEY is not set. Add it to backend/.env and restart uvicorn.")
    from langchain_google_genai import ChatGoogleGenerativeAI  # imported lazily so tests run without it
    return ChatGoogleGenerativeAI(
        model=os.getenv("GEMINI_MODEL", DEFAULT_MODEL),
        google_api_key=api_key,
        temperature=0.4,
        max_retries=3,
        timeout=90,
    )


def _to_text(content) -> str:
    """Newer LangChain versions can return a list of content blocks instead of a plain string."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("type", "text") == "text":
                parts.append(str(block.get("text", "")))
        return "".join(parts)
    return str(content)


def generate_text(system: str, user: str) -> str:
    llm = get_llm()
    try:
        response = llm.invoke([SystemMessage(content=system), HumanMessage(content=user)])
    except Exception as e:  # auth, quota (429), model-not-found, network ...
        msg = str(e)
        if "429" in msg or "RESOURCE_EXHAUSTED" in msg or "quota" in msg.lower():
            raise LLMUnavailable("Gemini free-tier rate limit reached. Wait a minute and retry, or analyse fewer scenes.") from e
        if "API key" in msg or "API_KEY" in msg or "401" in msg or "403" in msg:
            raise LLMUnavailable("Gemini rejected the API key. Check GOOGLE_API_KEY in backend/.env.") from e
        if "404" in msg or "NOT_FOUND" in msg:
            raise LLMUnavailable(f"Gemini model '{os.getenv('GEMINI_MODEL', DEFAULT_MODEL)}' was not found. Set GEMINI_MODEL in backend/.env.") from e
        raise LLMUnavailable(f"Gemini request failed: {msg[:300]}") from e
    return _to_text(response.content)


claude = generate_text  # backwards-compatible name used by workflow.py
