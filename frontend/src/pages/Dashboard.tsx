import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
export default function Dashboard() {
  const { projects, create, remove } = useStore();
  const [title, setTitle] = useState(""); const [genre, setGenre] = useState("Drama");
  const nav = useNavigate();
  const submit = (e: FormEvent) => { e.preventDefault(); if (!title.trim()) return; nav(`/project/${create(title.trim(), genre).id}`); };
  const recent = projects.filter(p => p.scenes.length).slice(0, 3);
  return (
    <>
      <section className="hero">
        <h1>Turn a screenplay into a score.</h1>
        <p>Paste your scenes. SoundScript plans the music for each one, grounded in film-scoring references you can inspect.</p>
        <form onSubmit={submit} className="row">
          <input aria-label="Film title" placeholder="Film title" value={title} onChange={e => setTitle(e.target.value)} />
          <select aria-label="Genre" value={genre} onChange={e => setGenre(e.target.value)}>
            {["Drama","Thriller","Horror","Sci-Fi","Romance","Action","Animation"].map(g => <option key={g}>{g}</option>)}
          </select>
          <button className="btn primary" type="submit">Create project</button>
        </form>
      </section>
      <section>
        <h2>Your projects</h2>
        {projects.length === 0 ? <p className="empty">No projects yet. Name your film above to begin.</p> : (
          <div className="grid">{projects.map(p => (
            <article className="card" key={p.id}>
              <h3><Link to={`/project/${p.id}`}>{p.title}</Link></h3>
              <p className="muted">{p.genre}, {p.scenes.length} scenes, {p.themes.length} themes</p>
              <p className="muted small">Edited {new Date(p.updatedAt).toLocaleDateString()}</p>
              <button className="btn" onClick={() => confirm(`Delete "${p.title}"?`) && remove(p.id)}>Delete</button>
            </article>))}</div>)}
      </section>
      {recent.length > 0 && <section><h2>Recent analyses</h2>
        <ul>{recent.map(p => <li key={p.id}><Link to={`/project/${p.id}/scenes`}>{p.title}</Link> <span className="muted">{p.scenes.length} scenes planned</span></li>)}</ul></section>}
    </>
  );
}
