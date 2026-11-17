import { describe, it, expect, beforeEach } from "vitest";
import { loadProjects, saveProjects, newProject } from "../lib/storage";
describe("storage", () => {
  beforeEach(() => localStorage.clear());
  it("round-trips projects", () => {
    const p = newProject("Test", "Drama");
    expect(saveProjects([p])).toBeNull();
    expect(loadProjects().projects[0].title).toBe("Test");
  });
  it("reports corrupted data instead of crashing", () => {
    localStorage.setItem("soundscript.projects.v1", "{bad");
    expect(loadProjects().error).toMatch(/Could not read/);
  });
});
