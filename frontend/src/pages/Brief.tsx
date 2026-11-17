import type { Project } from "../types";
import { useStore } from "../lib/store";
import { compileBrief } from "../lib/brief";

export default function Brief({ project }: { project: Project }) {
  const { update } = useStore();
  const compile = () => {
    if (project.brief.trim() && !confirm("Replace the current brief with a freshly compiled one?")) return;
    update(project.id, { brief: compileBrief(project) });
  };
  return (
    <section>
      <div className="row">
        <button className="btn primary" onClick={compile} disabled={!project.scenes.length} title={project.scenes.length ? "" : "Analyse scenes first"}>Compile from scenes and leitmotifs</button>
        <button className="btn" onClick={() => window.print()}>Print or save as PDF</button>
      </div>
      <label htmlFor="brief">Composer's brief</label>
      <textarea id="brief" rows={18} value={project.brief} onChange={e => update(project.id, { brief: e.target.value })}
        placeholder="Compile the brief from your planned scenes and leitmotifs, then edit it by hand." />
    </section>
  );
}
