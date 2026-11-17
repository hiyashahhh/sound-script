"""Gemini embeddings. Vectors are L2-normalised so inner-product search behaves like cosine similarity."""
import os

import numpy as np

DEFAULT_MODEL = "gemini-embedding-001"
DEFAULT_DIM = 768


def embed_dim() -> int:
    return int(os.getenv("EMBED_DIM", DEFAULT_DIM))


class EmbeddingError(OSError):
    """Embedding service unavailable (missing key, quota, network). Subclasses OSError so the API returns a 503."""


_client = None


def _get_client():
    global _client
    if _client is None:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise EmbeddingError("GOOGLE_API_KEY is not set. Add it to backend/.env and restart uvicorn.")
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
        _client = GoogleGenerativeAIEmbeddings(
            model=os.getenv("EMBED_MODEL", DEFAULT_MODEL),
            google_api_key=api_key,
            output_dimensionality=embed_dim(),
        )
    return _client


def embed(texts):
    """Accepts a string or a list of strings; always returns a list of vectors (list[list[float]])."""
    if isinstance(texts, str):
        texts = [texts]
    if not texts:
        return []
    client = _get_client()
    try:
        # Documents and queries use different task types; a single-item call is treated as a query.
        vecs = [client.embed_query(texts[0])] if len(texts) == 1 else client.embed_documents(list(texts))
    except Exception as e:
        raise EmbeddingError(f"Gemini embedding request failed: {str(e)[:300]}") from e
    arr = np.array(vecs, dtype="float32")
    arr /= np.linalg.norm(arr, axis=1, keepdims=True).clip(min=1e-12)
    return arr.tolist()
