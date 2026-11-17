import { describe, it, expect } from "vitest";
import { compileBrief, moveItem } from "../lib/brief";
import { newProject } from "../lib/storage";
import { normaliseScene } from "../lib/api";

describe("brief", () => {
  it("compiles scenes and leitmotifs", () => {
    const p = newProject("Lighthouse", "Horror");
    p.scenes = [normaliseScene({ id: "a", heading: "INT. TOWER - NIGHT", mood: "dread", durationSec: 90, instrumentation: "low strings" })];
    p.themes = [{ id: "t", name: "Mara", kind: "character", meaning: "her fear", instruments: "celesta", sceneIds: ["a"], evolution: "" }];
    const b = compileBrief(p);
    expect(b).toContain("COMPOSER'S BRIEF: Lighthouse"); expect(b).toContain("1. INT. TOWER - NIGHT (1:30)");
    expect(b).toContain("Mara (character)"); expect(b).toContain("Scenes: 1.");
  });
  it("moves items without mutating or going out of range", () => {
    const a = [1, 2, 3];
    expect(moveItem(a, 0, 1)).toEqual([2, 1, 3]); expect(a).toEqual([1, 2, 3]);
    expect(moveItem(a, 0, -1)).toBe(a);
  });
});
