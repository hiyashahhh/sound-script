"""Vector stores: Pinecone when PINECONE_API_KEY is set, otherwise a real local FAISS index (demo mode)."""
import os
from .embeddings import embed, embed_dim
from .ingest import load_chunks

DIM = embed_dim()  # Gemini embedding size (EMBED_DIM, default 768)

class FaissStore:
    mode = "local-faiss-demo"
    def __init__(self, chunks):
        import faiss, numpy as np
        self.chunks = chunks
        self.index = faiss.IndexFlatIP(DIM)
        self.index.add(np.array(embed([c["text"] for c in chunks]), dtype="float32"))
    def search(self, vec, k):
        import numpy as np
        scores, ids = self.index.search(np.array([vec], dtype="float32"), k)
        return [{**self.chunks[i], "score": float(s)} for s, i in zip(scores[0], ids[0]) if i >= 0]

class PineconeStore:
    mode = "pinecone"
    def __init__(self):
        from pinecone import Pinecone
        self.index = Pinecone(api_key=os.environ["PINECONE_API_KEY"]).Index(os.getenv("PINECONE_INDEX", "soundscript"))
    def upsert(self, chunks):
        vecs = embed([c["text"] for c in chunks])
        self.index.upsert([(c["id"], v, c) for c, v in zip(chunks, vecs)])
    def search(self, vec, k):
        res = self.index.query(vector=vec, top_k=k, include_metadata=True)
        return [{**m.metadata, "id": m.id, "score": float(m.score)} for m in res.matches]

_store = None
def get_store():
    global _store
    if _store is None:
        _store = PineconeStore() if os.getenv("PINECONE_API_KEY") else FaissStore(load_chunks())
    return _store
