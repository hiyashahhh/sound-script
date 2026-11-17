from .embeddings import embed
from .store import get_store

def retrieve(query: str, k: int = 4):
    """Semantic search. Returns passages with id, title, topic, text, source, score."""
    return get_store().search(embed([query])[0], k)
