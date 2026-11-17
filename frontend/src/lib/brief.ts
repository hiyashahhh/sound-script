import type { Project } from "../types";

export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = arr.slice();
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

/** Composer's brief assembled from the planned scenes and leitmotifs (no network needed). */
export function compileBrief(p: Project): string {
  const total = p.scenes.reduce((a, s) => a + s.durationSec, 0);
  const out: string[] = [
    `COMPOSER'S BRIEF: ${p.title}`, `Genre: ${p.genre}`,
    `Scenes planned: ${p.scenes.length}   Estimated music runtime: ${mmss(total)}`, "",
  ];
  p.scenes.forEach((s, i) => {
    out.push(`${i + 1}. ${s.heading} (${mmss(s.durationSec)})`);
    out.push(`   Mood: ${s.mood}; intensity ${s.intensity}/10. ${s.purpose}`);
    out.push(`   Instrumentation: ${s.instrumentation}. Style: ${s.style}. Tempo: ${s.tempo}. Texture: ${s.texture}.`);
    out.push(`   Cue in: ${s.cueIn}  |  Cue out: ${s.cueOut}  |  Transition: ${s.transition}`);
    if (s.silenceNotes) out.push(`   Silence: ${s.silenceNotes}`);
    if (s.explanation) out.push(`   Why: ${s.explanation}`);
    if (s.sources.length) out.push(`   References: ${s.sources.map(x => x.title).join("; ")}`);
    out.push("");
  });
  if (p.themes.length) {
    out.push("LEITMOTIFS");
    p.themes.forEach(t => {
      const where = t.sceneIds.map(id => p.scenes.findIndex(s => s.id === id) + 1).filter(n => n > 0).join(", ");
      out.push(`- ${t.name} (${t.kind}): ${t.meaning}${t.instruments ? ` Instruments: ${t.instruments}.` : ""}${where ? ` Scenes: ${where}.` : ""}${t.evolution ? ` Evolution: ${t.evolution}` : ""}`);
    });
  }
  return out.join("\n").trim();
}
