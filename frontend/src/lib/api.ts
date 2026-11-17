import type { Scene, Source } from "../types";

export interface Health { status: string; vector_store: string; llm_configured: boolean; tracing: boolean }
export interface AnalyzeInput { title: string; genre: string; screenplay: string }
export class ApiError extends Error {}

const UNREACHABLE = "Cannot reach the backend. Start it with: uvicorn app.main:app --reload (port 8000).";
const str = (v: unknown, d = "") => (typeof v === "string" ? v : v == null ? d : String(v));
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

/** Turn whatever the LLM-backed API returned into a safe Scene (numbers clamped, strings guaranteed). */
export function normaliseScene(raw: unknown): Scene {
  const r = rec(raw);
  const inten = Number(r.intensity), dur = Number(r.durationSec);
  const sources: Source[] = (Array.isArray(r.sources) ? r.sources : []).map(x => {
    const s = rec(x);
    return { id: str(s.id), title: str(s.title), topic: str(s.topic), excerpt: str(s.excerpt), score: typeof s.score === "number" ? s.score : undefined };
  });
  const status = r.status === "ok" || r.status === "error" ? r.status : "degraded";
  return {
    id: str(r.id, crypto.randomUUID()), heading: str(r.heading, "Untitled scene"),
    summary: str(r.summary), purpose: str(r.purpose), mood: str(r.mood),
    intensity: Number.isFinite(inten) ? Math.min(10, Math.max(1, Math.round(inten))) : 5,
    instrumentation: str(r.instrumentation), style: str(r.style), tempo: str(r.tempo), texture: str(r.texture),
    cueIn: str(r.cueIn), cueOut: str(r.cueOut), transition: str(r.transition), silenceNotes: str(r.silenceNotes),
    durationSec: Number.isFinite(dur) && dur > 0 ? Math.round(dur) : 60,
    explanation: str(r.explanation), sources, status,
    issues: Array.isArray(r.issues) ? r.issues.map(x => str(x)) : [],
    attempts: Number(r.attempts) || 0,
  };
}

export async function getHealth(signal?: AbortSignal): Promise<Health> {
  const r = await fetch("/api/health", { signal });
  if (!r.ok) throw new ApiError(`Backend returned ${r.status}`);
  return r.json();
}

export async function analyze(input: AnalyzeInput, signal?: AbortSignal): Promise<Scene[]> {
  let r: Response;
  try {
    r = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(UNREACHABLE);
  }
  let body: Record<string, unknown> | null = null;
  try { body = rec(await r.json()); } catch { /* empty or non-JSON body */ }
  if (!r.ok) {
    if (!body && r.status >= 500) throw new ApiError(UNREACHABLE); // Vite proxy answers 500/502 when nothing listens on :8000
    const detail = body?.detail;
    if (typeof detail === "string") throw new ApiError(detail);
    if (r.status === 422) throw new ApiError("The screenplay must be between 20 and 60,000 characters.");
    throw new ApiError(`Backend error (${r.status}).`);
  }
  return (Array.isArray(body?.scenes) ? (body!.scenes as unknown[]) : []).map(normaliseScene);
}
