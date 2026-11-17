export interface Source { id: string; title: string; topic: string; excerpt: string; score?: number }
export interface Scene {
  id: string; heading: string; summary: string; purpose: string; mood: string;
  intensity: number; // 1-10
  instrumentation: string; style: string; tempo: string; texture: string;
  cueIn: string; cueOut: string; transition: string; silenceNotes: string;
  durationSec: number; explanation: string; sources: Source[];
  status?: "ok" | "degraded" | "error"; // from the LangGraph validation step
  issues?: string[]; attempts?: number;
}
export interface Leitmotif {
  id: string; name: string; kind: "character" | "relationship" | "location" | "concept";
  meaning: string; instruments: string; sceneIds: string[]; evolution: string;
}
export interface Project {
  id: string; title: string; genre: string; screenplay: string;
  scenes: Scene[]; themes: Leitmotif[]; brief: string; updatedAt: number;
}
