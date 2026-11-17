import type { Project } from "../types";
const KEY = "soundscript.projects.v1";
export interface LoadResult { projects: Project[]; error: string | null }
export function loadProjects(): LoadResult {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { projects: [], error: null };
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error("Stored data is not a list");
    return { projects: data as Project[], error: null };
  } catch (e) {
    return { projects: [], error: `Could not read saved projects: ${(e as Error).message}` };
  }
}
export function saveProjects(projects: Project[]): string | null {
  try { localStorage.setItem(KEY, JSON.stringify(projects)); return null; }
  catch (e) { return `Could not save: ${(e as Error).message}. Storage may be full or blocked.`; }
}
export function newProject(title: string, genre: string): Project {
  return { id: crypto.randomUUID(), title, genre, screenplay: "", scenes: [], themes: [], brief: "", updatedAt: Date.now() };
}
