import { NavLink, Route, Routes, useParams, Navigate } from "react-router-dom";
import { useStore } from "../lib/store";
import Analysis from "./Analysis";
import Scenes from "./Scenes";
import Timeline from "./Timeline";
import Themes from "./Themes";
import Brief from "./Brief";
const tabs = [["", "Screenplay"], ["scenes", "Scenes"], ["timeline", "Timeline"], ["themes", "Leitmotifs"], ["brief", "Brief"]];
export default function Workspace() {
  const { id } = useParams(); const { projects } = useStore();
  const project = projects.find(p => p.id === id);
  if (!project) return <Navigate to="/" replace />;
  return (
    <>
      <h1>{project.title} <span className="muted tag">{project.genre}</span></h1>
      <nav className="tabs" aria-label="Project sections">
        {tabs.map(([to, label]) => <NavLink key={to} end={to === ""} to={to}>{label}</NavLink>)}
      </nav>
      <Routes>
        <Route index element={<Analysis project={project} />} />
        <Route path="scenes" element={<Scenes project={project} />} />
        <Route path="timeline" element={<Timeline project={project} />} />
        <Route path="themes" element={<Themes project={project} />} />
        <Route path="brief" element={<Brief project={project} />} />
      </Routes>
    </>
  );
}
