import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Project } from "../types";
import { loadProjects, saveProjects, newProject } from "./storage";
interface Ctx {
  projects: Project[]; error: string | null;
  create: (t: string, g: string) => Project;
  update: (id: string, patch: Partial<Project>) => void;
  remove: (id: string) => void;
}
const C = createContext<Ctx | null>(null);
export const useStore = () => { const v = useContext(C); if (!v) throw new Error("No store"); return v; };
export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = loadProjects();
  const [projects, setProjects] = useState<Project[]>(initial.projects);
  const [error, setError] = useState<string | null>(initial.error);
  useEffect(() => { const e = saveProjects(projects); if (e) setError(e); }, [projects]);
  const create = (t: string, g: string) => { const p = newProject(t, g); setProjects(s => [p, ...s]); return p; };
  const update = (id: string, patch: Partial<Project>) =>
    setProjects(s => s.map(p => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)));
  const remove = (id: string) => setProjects(s => s.filter(p => p.id !== id));
  return <C.Provider value={{ projects, error, create, update, remove }}>{children}</C.Provider>;
}
