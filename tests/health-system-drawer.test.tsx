import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { HealthSystemDrawer } from "@/components/drawers/HealthSystemDrawer";
import { buildTableFixture } from "./fixtures/table-data";

afterEach(() => vi.unstubAllGlobals());
it("shows system totals and opens a member hospital without write controls", async () => {
  const user = userEvent.setup();
  const fixture = buildTableFixture();
  const base = fixture.healthSystems[0]!;
  const hospitals = fixture.hospitals.filter((h) => h.canonicalHealthSystemId === base.id);
  const system = { ...base, id: "example.org", hospitals };
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ healthSystem: system }) });
  vi.stubGlobal("fetch", fetcher);
  const open = vi.fn();
  render(<HealthSystemDrawer healthSystemId="example.org" onClose={() => {}} onHospitalClick={open} />);
  await screen.findByText(system.name);
  expect(screen.getByText("Total beds")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /edit|save|delete/i })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: new RegExp(hospitals[0]!.name) }));
  expect(open).toHaveBeenCalledWith(hospitals[0]!.id);
  expect(fetcher.mock.calls[0]?.[0]).toBe("/api/health-systems/example.org");
});
