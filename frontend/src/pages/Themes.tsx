import { FormEvent, useState } from "react";
import type { Leitmotif, Project } from "../types";
import { useStore } from "../lib/store";

const KINDS: Leitmotif["kind"][] = ["character", "relationship", "location", "concept"];
const blank = { name: "", kind: "character" as Leitmotif["kind"], meaning: "", instruments: "", evolution: "", sceneIds: [] as string[] };

export default function Themes({ project }: { project: Project }) {
  const { update } = useStore();
  const [f, setF] = useState(blank);
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    update(project.id, { themes: [...project.themes, { id: crypto.randomUUID(), ...f, name: f.name.trim() }] });
    setF(blank);
  };
  const toggle = (id: string) => setF(s => ({ ...s, sceneIds: s.sceneIds.includes(id) ? s.sceneIds.filter(x => x !== id) : [...s.sceneIds, id] }));
  return (
    <section>
      <form onSubmit={add} className="card">
        <h3>Add a leitmotif</h3>
        <div className="row">
          <input aria-label="Theme name" placeholder="Name, e.g. Mara's theme" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
          <select aria-label="Kind" value={f.kind} onChange={e => setF({ ...f, kind: e.target.value as Leitmotif["kind"] })}>
            {KINDS.map(k => <option key={k}>{k}</option>)}
          </select>
        </div>
        <label>Meaning<input value={f.meaning} onChange={e => setF({ ...f, meaning: e.target.value })} /></label>
        <label>Instruments<input value={f.instruments} onChange={e => setF({ ...f, instruments: e.target.value })} /></label>
        <label>How it evolves<input value={f.evolution} onChange={e => setF({ ...f, evolution: e.target.value })} /></label>
        {project.scenes.length > 0 && <fieldset className="checks"><legend className="muted small">Appears in scenes</legend>
          {project.scenes.map((s, i) => <label key={s.id}><input type="checkbox" checked={f.sceneIds.includes(s.id)} onChange={() => toggle(s.id)} /> {i + 1}. {s.heading}</label>)}
        </fieldset>}
        <button className="btn primary" type="submit" disabled={!f.name.trim()}>Add leitmotif</button>
      </form>
      {project.themes.length === 0 ? <p className="empty">No leitmotifs yet. Add one for a character, relationship, place or idea.</p> : (
        <div className="grid">{project.themes.map(t => (
          <article className="card" key={t.id}>
            <h3>{t.name}</h3><p className="muted">{t.kind}</p><p>{t.meaning}</p>
            {t.instruments && <p className="small"><span className="muted">Instruments: </span>{t.instruments}</p>}
            {t.evolution && <p className="small"><span className="muted">Evolution: </span>{t.evolution}</p>}
            <button className="btn" onClick={() => update(project.id, { themes: project.themes.filter(x => x.id !== t.id) })}>Remove</button>
          </article>))}</div>)}
    </section>
  );
}
