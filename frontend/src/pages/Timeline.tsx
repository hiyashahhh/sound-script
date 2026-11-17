import type { Project } from "../types";
export default function Timeline({ project }: { project: Project }) {
  if (!project.scenes.length) return <p className="empty">The timeline fills in once scenes are planned.</p>;
  const total = project.scenes.reduce((a, s) => a + s.durationSec, 0) || 1;
  return (
    <div className="timeline" role="list" aria-label="Soundtrack timeline">
      {project.scenes.map(s => (
        <div role="listitem" key={s.id} className="seg" style={{ flexGrow: s.durationSec / total, height: 40 + s.intensity * 12 }} title={`${s.heading}: ${s.durationSec}s`}>
          <span>{s.heading}</span>
        </div>))}
    </div>
  );
}
