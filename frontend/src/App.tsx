import { Link, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Workspace from "./pages/Workspace";
import { useStore } from "./lib/store";
export default function App() {
  const { error } = useStore();
  return (
    <>
      <header className="topbar"><Link to="/" className="brand">SoundScript</Link></header>
      {error && <div role="alert" className="banner error">{error}</div>}
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/project/:id/*" element={<Workspace />} />
          <Route path="*" element={<p className="empty">That page doesn't exist. <Link to="/">Back to projects</Link></p>} />
        </Routes>
      </main>
    </>
  );
}
