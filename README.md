# SoundScript

AI film-music planning assistant. Paste a screenplay; SoundScript splits it into scenes and plans the music for each one (mood, intensity, instrumentation, tempo, cues, transitions, silence), **grounded in a film-scoring knowledge base** and with every claim traced to the passages it cites. It plans music; it does not generate audio.

**Stack:** React + TypeScript + Vite (frontend) · FastAPI (backend) · RAG with Google Gemini embeddings (`gemini-embedding-001`) and Pinecone *or* local FAISS · LangGraph workflow with validation + retry · Google Gemini (free API key) · LangSmith / JSONL tracing.

## How it fits together

```
Browser (React)  --/api/analyze-->  FastAPI  -->  LangGraph, once per scene:
 Screenplay tab                                   analyse -> prepare_query -> retrieve -> generate -> validate
 Scenes / Timeline / Leitmotifs / Brief                                          ^                        |
 (saved in localStorage)                                                          '-- retry with broader query (max 2)
                                                  retrieve: embeddings -> Pinecone | FAISS  (knowledge/*.md)
                                                  generate: Gemini, JSON only, must cite retrieved passage ids
                                                  validate: all fields present, intensity 1-10, citations really retrieved
```
Each run returns its trace (also appended to `backend/logs/traces.jsonl`). The Scenes tab shows a **Grounded / Needs review** badge from the validation step and lets you open the cited source passages.

## Run it (step by step)

**Prerequisites:** Python 3.10+, Node 18+, a free Gemini API key (https://aistudio.google.com/app/apikey) and internet access (embeddings and analysis are Gemini API calls; no PyTorch/model download needed).

### 1. Backend (terminal 1)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env               # Windows: copy .env.example .env
# edit .env and paste GOOGLE_API_KEY=your-gemini-key
uvicorn app.main:app --reload      # serves http://localhost:8000
```
Check it: open http://localhost:8000/api/health. You want `"llm_configured": true`.
The first analysis (or `/api/retrieve?q=tension`) is slightly slower because the knowledge base is embedded once at startup.

### 2. Frontend (terminal 2)
```bash
cd frontend
npm install
npm run dev                        # opens http://localhost:5173
```
Vite proxies `/api` to port 8000, so no CORS or URL setup is needed.

### 3. Use it
1. Create a project (title + genre).
2. On the **Screenplay** tab paste scenes starting with `INT.` / `EXT.` lines (a sample is in the placeholder) and click **Analyse scenes**. A green "Backend connected" line confirms the link.
3. You land on **Scenes**: edit instrumentation/tempo/duration, reorder with the arrows, open "cited sources".
4. **Timeline** shows scene length and intensity; **Leitmotifs** lets you add recurring themes; **Brief** compiles everything into a composer's brief you can edit and print to PDF.

## Tests and evaluation
```bash
cd backend  && pytest                      # 16 offline tests (stubs for Gemini and the retriever) + 1 that needs a real GOOGLE_API_KEY (skipped otherwise)
cd frontend && npm test                    # 10 tests, incl. clicking "Analyse" and checking the API call and error handling
cd backend  && python -m app.eval.run_eval # measured Precision@3 / Recall@3 on app/eval/queries.json (needs GOOGLE_API_KEY)
```
Quote the numbers you measure yourself in your report.

## Optional: Pinecone
Set `PINECONE_API_KEY` (and optionally `PINECONE_INDEX`) in `backend/.env`. The index dimension must equal `EMBED_DIM` (768 by default; delete an old 384-dim index first), run `python -m scripts.ingest_pinecone` once, restart uvicorn. `/api/health` then reports `pinecone`. Without a key the app uses a local FAISS index.

## Optional: LangSmith
Set `LANGSMITH_API_KEY` and `LANGSMITH_TRACING=true` in `backend/.env`.

## API
`POST /api/analyze {title, genre, screenplay}` -> `{scenes: [...]}` · `GET /api/retrieve?q=...&k=4` · `GET /api/health`

## Troubleshooting
| Symptom | Fix |
|---|---|
| "Cannot reach the backend" in the UI | Start uvicorn on port 8000 (step 1). |
| "GOOGLE_API_KEY is not set" | Add it to `backend/.env`, restart uvicorn. |
| "Gemini free-tier rate limit reached" | Wait a minute and retry, or analyse fewer scenes at a time. |
| "Gemini model ... was not found" | Set `GEMINI_MODEL` in `backend/.env` to a model listed at ai.google.dev/gemini-api/docs/models. |
| "Retrieval backend unavailable" | The Gemini embedding call failed; check internet and your key, then retry. |
| `ModuleNotFoundError: app` | Run commands from inside `backend/`. |
| Analysis of long scripts is slow | Scenes are processed one after another (max 30 per request); try a shorter excerpt first. |

## Known limitations
The knowledge base is small (8 short original notes), there is no genre metadata filter or reranking yet, analysis cost scales with scene count, and projects are stored in the browser (localStorage) only, so there are no accounts or sync.
