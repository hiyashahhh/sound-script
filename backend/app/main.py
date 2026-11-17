import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).resolve().parents[1] / ".env")  # works no matter where uvicorn is started
from .api.routes import router
app = FastAPI(title="SoundScript API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_methods=["*"], allow_headers=["*"])

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "vector_store": "pinecone" if os.getenv("PINECONE_API_KEY") else "local-faiss-demo",
        "llm_configured": bool(os.getenv("GOOGLE_API_KEY")),
        "tracing": os.getenv("LANGSMITH_TRACING", "false") == "true",
    }

app.include_router(router)