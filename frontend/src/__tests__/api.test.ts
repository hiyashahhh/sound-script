import { describe, it, expect, vi, afterEach } from "vitest";
import { analyze, normaliseScene } from "../lib/api";

const input = { title: "T", genre: "Drama", screenplay: "x".repeat(30) };
afterEach(() => vi.unstubAllGlobals());
const reply = (status: number, body: unknown) =>
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => { if (body === undefined) throw new Error("empty"); return body; } }));

describe("api", () => {
  it("maps backend scenes and clamps bad numbers", async () => {
    reply(200, { scenes: [{ id: "1", heading: "INT. A", intensity: "15", durationSec: 0, status: "ok",
      sources: [{ id: "t-0", title: "T", topic: "tension", excerpt: "x", score: 0.8 }] }] });
    const [s] = await analyze(input);
    expect(s.intensity).toBe(10); expect(s.durationSec).toBe(60);
    expect(s.sources[0].topic).toBe("tension"); expect(s.status).toBe("ok");
  });
  it("surfaces the backend's detail message (e.g. missing API key)", async () => {
    reply(503, { detail: "GOOGLE_API_KEY is not set." });
    await expect(analyze(input)).rejects.toThrow(/GOOGLE_API_KEY/);
  });
  it("explains an unreachable backend", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(analyze(input)).rejects.toThrow(/Cannot reach the backend/);
    reply(500, undefined); // Vite proxy error with an empty body
    await expect(analyze(input)).rejects.toThrow(/Cannot reach the backend/);
  });
  it("never trusts missing fields", () => {
    const s = normaliseScene({});
    expect(s.heading).toBe("Untitled scene"); expect(s.intensity).toBe(5); expect(s.sources).toEqual([]);
  });
});
