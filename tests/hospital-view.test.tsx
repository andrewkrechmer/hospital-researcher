import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HealthSystemView } from "@/components/table/HealthSystemView";
import { ViewToggle } from "@/components/table/ViewToggle";

import { buildTableFixture } from "./fixtures/table-data";
import { ResizeObserverStub } from "./fixtures/virtualizer-stub";

const fixture = buildTableFixture();

/** Stub `fetch` so useTableData loads the fixture without a server. */
function stubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.startsWith("/api/hospitals")) {
        return {
          ok: true,
          json: async () => ({ hospitals: fixture.hospitals, count: fixture.hospitals.length }),
        };
      }
      if (url.startsWith("/api/health-systems")) {
        return {
          ok: true,
          json: async () => ({ healthSystems: fixture.healthSystems, count: fixture.healthSystems.length }),
        };
      }
      return { ok: false, json: async () => ({}) };
    }),
  );
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ViewToggle", () => {
  it("marks the active view with aria-pressed", () => {
    render(<ViewToggle view="health-system" onChange={() => {}} />);
    const hs = screen.getByRole("button", { name: "Health System View" });
    const hv = screen.getByRole("button", { name: "Hospital View" });
    expect(hs).toHaveAttribute("aria-pressed", "true");
    expect(hv).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onChange with the selected view", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ViewToggle view="health-system" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Hospital View" }));
    expect(onChange).toHaveBeenCalledWith("hospital");
  });
});

describe("HealthSystemView container", () => {
  it("defaults to Health System View on first load", async () => {
    render(<HealthSystemView />);
    // Wait for data to load and the Health System View table to render.
    const table = await screen.findByRole("table", { name: "Health System View" });
    expect(table).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Hospital View" })).not.toBeInTheDocument();
  });

  it("toggles to Hospital View and back without page navigation", async () => {
    const user = userEvent.setup();
    render(<HealthSystemView />);
    await screen.findByRole("table", { name: "Health System View" });

    // Switch to Hospital View
    await user.click(screen.getByRole("button", { name: "Hospital View" }));
    expect(screen.getByRole("table", { name: "Hospital View" })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Health System View" })).not.toBeInTheDocument();

    // Switch back to Health System View
    await user.click(screen.getByRole("button", { name: "Health System View" }));
    expect(screen.getByRole("table", { name: "Health System View" })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Hospital View" })).not.toBeInTheDocument();
  });

  it("Hospital View shows one row per hospital including independents", async () => {
    const user = userEvent.setup();
    const { container } = render(<HealthSystemView />);
    await screen.findByRole("table", { name: "Health System View" });

    await user.click(screen.getByRole("button", { name: "Hospital View" }));
    const rows = container.querySelectorAll("[data-row-type='hospital']");
    expect(rows).toHaveLength(fixture.hospitals.length);
    // No group rows in Hospital View
    expect(container.querySelectorAll("[data-row-type='group']")).toHaveLength(0);
  });

  it("persists Health System View sort state across a view toggle", async () => {
    const user = userEvent.setup();
    render(<HealthSystemView />);
    await screen.findByRole("table", { name: "Health System View" });

    // Sort Health System View by Total Beds (descending)
    await user.click(screen.getByRole("button", { name: "Sort by Total Beds" }));
    const hsButton = screen.getByRole("button", { name: "Sort by Total Beds" });
    const hsHeader = hsButton.closest("[role='columnheader']");
    expect(hsHeader).toHaveAttribute("aria-sort", "descending");

    // Toggle to Hospital View — its headers start unsorted
    await user.click(screen.getByRole("button", { name: "Hospital View" }));
    expect(screen.getByRole("table", { name: "Hospital View" })).toBeInTheDocument();

    // Toggle back — Health System View sort is still applied
    await user.click(screen.getByRole("button", { name: "Health System View" }));
    const restoredButton = screen.getByRole("button", { name: "Sort by Total Beds" });
    const restoredHeader = restoredButton.closest("[role='columnheader']");
    expect(restoredHeader).toHaveAttribute("aria-sort", "descending");
  });
});
