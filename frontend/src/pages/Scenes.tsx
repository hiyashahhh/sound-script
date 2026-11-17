import type { Project, Scene } from "../types";
import { useStore } from "../lib/store";
import { moveItem } from "../lib/brief";

const BADGE = { ok: "Grounded", degraded: "Needs review", error: "Failed" } as const;
const line = (label: string, v: string) => v ? <p className="small"><span className="muted">{label}: </span>{v}</p> : null;

export default function Scenes({ project }: { project: Project }) {
  const { update } = useStore();
  if (!project.scenes.length) return <p className="empty">No scenes yet. Add a screenplay and run the analysis.</p>;
  const setScenes = (scenes: Scene[]) => update(project.id, { scenes });
  const edit = (id: string, patch: Partial<Scene>) => setScenes(project.scenes.map(s => (s.id === id ? { ...s, ...patch } : s)));
  const move = (i: number, d: number) => setScenes(moveItem(project.scenes, i, i + d));
  return (
    <div className="grid">{project.scenes.map((s, i) => (
      <article className="card scene" key={s.id} style={{ borderLeftColor: `hsl(${20 - s.intensity * 2} 70% ${25 + s.intensity * 3}%)` }}>
        <div className="between">
          <h3>{i + 1}. {s.heading}</h3>
          {s.status && <span className={`badge ${s.status}`} title={`Validation: ${s.attempts ?? 0} retries`}>{BADGE[s.status]}</span>}
        </div>
        <p className="muted">{s.mood}, intensity {s.intensity}/10</p>
        {s.summary && <p>{s.summary}</p>}
        {line("Purpose", s.purpose)}{line("Style", s.style)}{line("Texture", s.texture)}
        {line("Cue in", s.cueIn)}{line("Cue out", s.cueOut)}{line("Transition", s.transition)}{line("Silence", s.silenceNotes)}
        {s.issues && s.issues.length > 0 && <p className="notice warn small">Validation issues: {s.issues.join("; ")}</p>}
        <label>Instrumentation<input value={s.instrumentation} onChange={e => edit(s.id, { instrumentation: e.target.value })} /></label>
        <label>Tempo<input value={s.tempo} onChange={e => edit(s.id, { tempo: e.target.value })} /></label>
        <label>Duration (sec)<input type="number" min={1} value={s.durationSec} onChange={e => edit(s.id, { durationSec: Math.max(1, Number(e.target.value) || 1) })} /></label>
        {s.explanation && <details><summary>Why this plan</summary><p className="small">{s.explanation}</p></details>}
        {s.sources.length > 0 && <details><summary>{s.sources.length} cited sources</summary>
          <ul>{s.sources.map(x => <li key={x.id} className="small"><strong>{x.title}</strong> <span className="muted">({x.topic}{x.score !== undefined ? `, similarity ${x.score.toFixed(2)}` : ""})</span><br />{x.excerpt}</li>)}</ul></details>}
        <div className="row">
          <button className="btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move scene ${i + 1} earlier`}>↑</button>
          <button className="btn" onClick={() => move(i, 1)} disabled={i === project.scenes.length - 1} aria-label={`Move scene ${i + 1} later`}>↓</button>
        </div>
      </article>))}</div>
  );
}
