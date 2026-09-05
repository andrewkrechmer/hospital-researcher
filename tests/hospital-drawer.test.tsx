import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { HospitalDrawer } from "@/components/drawers/HospitalDrawer";
import { makeHospitalDetail } from "./fixtures/drawer-data";

afterEach(() => vi.unstubAllGlobals());
it("displays source values without editing or claims controls", async () => {
  const hospital = makeHospitalDetail({ id: "9007199254740993", name: "Read-only Hospital", cmsCcn: "12A345", telephone: "555-0100" });
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ hospital }) });
  vi.stubGlobal("fetch", fetcher);
  render(<HospitalDrawer hospitalId={hospital.id} onClose={() => {}} />);
  await screen.findByText("Read-only Hospital");
  expect(screen.getByText("12A345")).toBeInTheDocument();
  expect(screen.getByText("555-0100")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /edit|delete|claim|save|assign/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(fetcher.mock.calls[0]?.[0]).toBe("/api/hospitals/9007199254740993");
});
it("does not fetch when closed", () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  render(<HospitalDrawer hospitalId={null} onClose={() => {}} />);
  expect(fetcher).not.toHaveBeenCalled();
});
it("recovers from a failed read and closes with Escape", async () => {
  const user = userEvent.setup();
  const close = vi.fn();
  const hospital = makeHospitalDetail({ id: "1", name: "Recovered hospital" });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValue({ ok: true, json: async () => ({ hospital }) }));
  render(<HospitalDrawer hospitalId="1" onClose={close} />);
  await screen.findByRole("alert");
  await user.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByText("Recovered hospital");
  await user.keyboard("{Escape}");
  expect(close).toHaveBeenCalled();
});
