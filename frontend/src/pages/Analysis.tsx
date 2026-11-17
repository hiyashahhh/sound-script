import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Project } from "../types";
import { useStore } from "../lib/store";
import { analyze, getHealth, type Health } from "../lib/api";

export default function Analysis({ project }: { project: Project }) {
  const { update } = useStore();
  const nav = useNavigate();
  const [text, setText] = useState(project.screenplay);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [health, setHealth] = useState<Health | "down" | null>(null);
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => {
    const c = new AbortController();
    getHealth(c.signal).then(setHealth).catch(e => { if (e.name !== "AbortError") setHealth("down"); });
    return () => c.abort();
  }, []);

  async function run() {
    update(project.id, { screenplay: text });
    setErr(null); setBusy(true);
    ctl.current = new AbortController();
    try {
      const scenes = await analyze({ title: project.title, genre: project.genre, screenplay: text }, ctl.current.signal);
      if (!scenes.length) throw new Error("The backend returned no scenes.");
      update(project.id, { screenplay: text, scenes });
      nav(`/project/${project.id}/scenes`);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErr((e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <section>
      {health === "down" && <p className="notice warn" role="status">Backend not reachable. Start it on port 8000 (see README), then reload.</p>}
      {health && health !== "down" && !health.llm_configured &&
        <p className="notice warn" role="status">Backend is running, but GOOGLE_API_KEY is not set in backend/.env, so analysis will fail.</p>}
      {health && health !== "down" && health.llm_configured &&
        <p className="muted small" role="status">Backend connected. Vector store: {health.vector_store}{health.tracing ? ", LangSmith tracing on" : ""}.</p>}
      <label htmlFor="sp">Screenplay or scene descriptions</label>
      <textarea id="sp" rows={14} value={text} onChange={e => setText(e.target.value)}
        onBlur={() => update(project.id, { screenplay: text })}
        placeholder={"INT. LIGHTHOUSE - NIGHT\nMara climbs the stairs as the storm rattles the glass...\n\nEXT. CLIFF - DAWN\nShe stands at the edge, the radio silent."} />
      <div className="row">
        <button className="btn primary" onClick={run} disabled={busy || text.trim().length < 20}>
          {busy ? "Analysing…" : project.scenes.length ? "Re-analyse scenes" : "Analyse scenes"}
        </button>
        {busy && <button className="btn" onClick={() => ctl.current?.abort()}>Cancel</button>}
        <span className="muted small">
          {busy ? <><span className="spinner" aria-hidden /> Each scene is retrieved, planned and validated. This can take a while for long scripts.</>
                : "Scenes start at lines like INT. or EXT. Re-analysing replaces the current scene plan."}
        </span>
      </div>
      {err && <p className="notice error" role="alert">{err}</p>}
    </section>
  );
}
