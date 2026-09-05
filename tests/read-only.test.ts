// @vitest-environment node
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { middleware } from "@/middleware";

const mock = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn(), connect: vi.fn() }));
vi.mock("pg", () => ({ Pool: vi.fn(function () { return { connect: mock.connect, on: vi.fn() }; }) }));
import { readQuery } from "@/lib/db/client";

beforeEach(() => {
  mock.query.mockReset().mockResolvedValue({ rows: [] });
  mock.release.mockReset();
  mock.connect.mockResolvedValue({ query: mock.query, release: mock.release });
  vi.stubEnv("PGHOST", "/tmp"); vi.stubEnv("PGDATABASE", "hospitals"); vi.stubEnv("DATABASE_URL", "");
});
afterEach(() => vi.unstubAllEnvs());
it("starts an explicit read-only transaction on the same client and releases it", async () => {
  await readQuery("SELECT 1", []);
  expect(mock.query.mock.calls.map(([sql]) => sql)).toEqual(["BEGIN READ ONLY", "SELECT 1", "COMMIT"]);
  expect(mock.release).toHaveBeenCalledWith(false);
});
it("rolls back a failed query and releases the connection", async () => {
  mock.query.mockResolvedValueOnce({ rows: [] }).mockRejectedValueOnce(new Error("read failed"));
  await expect(readQuery("SELECT 1")).rejects.toThrow("read failed");
  expect(mock.query).toHaveBeenLastCalledWith("ROLLBACK");
  expect(mock.release).toHaveBeenCalled();
});
it.each(["POST", "PUT", "PATCH", "DELETE"])("rejects %s for current and retired API paths", async (method) => {
  for (const route of ["/api/hospitals", "/api/hospitals/1", "/api/health-systems/example.org", "/api/claims", "/api/import/upload", "/api/import/execute"]) {
    const response = middleware(new NextRequest(`http://localhost${route}`, { method }));
    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ error: "This application is read-only." });
  }
});
it("contains no mutation handlers, upload pages, or import execution code", () => {
  const root = path.resolve(__dirname, "../src");
  function routes(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? routes(path.join(dir, entry.name)) : entry.name === "route.ts" ? [path.join(dir, entry.name)] : []);
  }
  for (const route of routes(path.join(root, "app/api"))) {
    expect(readFileSync(route, "utf8")).not.toMatch(/export\s+(?:async\s+)?function\s+(POST|PUT|PATCH|DELETE)/);
  }
  for (const retired of ["app/imports", "app/api/import", "app/api/imports", "app/api/claims", "lib/import", "lib/db/imports.ts"]) expect(existsSync(path.join(root, retired))).toBe(false);
});
