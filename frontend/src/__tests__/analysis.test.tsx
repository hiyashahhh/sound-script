import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { StoreProvider, useStore } from "../lib/store";
import Analysis from "../pages/Analysis";
import { newProject } from "../lib/storage";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Harness() {
  const { projects } = useStore();
  const loc = useLocation();
  return <><Analysis project={projects[0]} /><output>{`scenes=${projects[0].scenes.length};path=${loc.pathname}`}</output></>;
}
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });
let root: Root, host: HTMLElement;

beforeEach(() => {
  const p = newProject("Lighthouse", "Horror");
  p.screenplay = "INT. LIGHTHOUSE - NIGHT\nMara climbs the stairs.";
  localStorage.setItem("soundscript.projects.v1", JSON.stringify([p]));
  host = document.body.appendChild(document.createElement("div"));
  root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); localStorage.clear(); });

describe("Analysis page", () => {
  it("clicking Analyse calls the backend and stores the returned scenes", async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true, status: 200,
      json: async () => url.endsWith("/health")
        ? { status: "ok", vector_store: "local-faiss-demo", llm_configured: true, tracing: false }
        : { scenes: [{ id: "s1", heading: "INT. LIGHTHOUSE - NIGHT", intensity: 6, durationSec: 40, status: "ok", sources: [] }] },
    }));
    vi.stubGlobal("fetch", fetchMock);
    await act(async () => { root.render(<MemoryRouter><StoreProvider><Harness /></StoreProvider></MemoryRouter>); });
    await flush();
    const btn = Array.from(host.querySelectorAll("button")).find(b => b.textContent === "Analyse scenes")!;
    expect(btn.disabled).toBe(false);
    await act(async () => { btn.click(); });
    await flush();
    const call = fetchMock.mock.calls.find(c => String(c[0]) === "/api/analyze")!;
    expect(call).toBeTruthy();
    expect(host.querySelector("output")!.textContent).toMatch(/^scenes=1;path=\/project\/.+\/scenes$/);
  });

  it("shows the backend's error and keeps existing data when analysis fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("/health")
      ? { ok: true, status: 200, json: async () => ({ status: "ok", vector_store: "x", llm_configured: false, tracing: false }) }
      : { ok: false, status: 503, json: async () => ({ detail: "GOOGLE_API_KEY is not set. Add it to backend/.env." }) }));
    await act(async () => { root.render(<MemoryRouter><StoreProvider><Harness /></StoreProvider></MemoryRouter>); });
    await flush();
    const btn = Array.from(host.querySelectorAll("button")).find(b => b.textContent === "Analyse scenes")!;
    await act(async () => { btn.click(); });
    await flush();
    expect(host.querySelector("[role=alert]")!.textContent).toMatch(/GOOGLE_API_KEY/);
    expect(host.querySelector("output")!.textContent).toMatch(/^scenes=0;path=\/$/);
  });
});
