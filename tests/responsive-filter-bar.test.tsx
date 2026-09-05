import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FilterBar } from "@/components/filters/FilterBar";
import { HealthSystemView } from "@/components/table/HealthSystemView";
import { emptyFilterState, type FilterState } from "@/lib/filters/filter-types";

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

/**
 * Stub `window.matchMedia` so the `useMediaQuery` hook reports a narrow
 * viewport. The hook reads `mql.matches` on mount, so the value passed here
 * controls which layout the FilterBar renders.
 */
function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })),
  );
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FilterBar responsive (narrow viewport, VAL-FILTER-062)", () => {
  const availableStates = ["CA", "NV", "OH"];

  beforeEach(() => {
    // Simulate a narrow viewport (e.g. 375px) — below the md (768px) breakpoint.
    stubMatchMedia(true);
  });

  it("collapses into a compact Filters button at narrow viewports", () => {
    render(
      <FilterBar
        state={emptyFilterState()}
        onChange={() => {}}
        onReset={() => {}}
        availableStates={availableStates}
      />,
    );

    // The compact "Filters" toggle button is present.
    const filtersButton = screen.getByRole("button", { name: /^Filters/ });
    expect(filtersButton).toBeInTheDocument();
    // The full inline toolbar is hidden until the panel is opened.
    expect(screen.queryByRole("toolbar", { name: "Table filters" })).not.toBeInTheDocument();
    // Individual advanced filter triggers are not visible until expanded.
    expect(screen.queryByRole("button", { name: /^State/ })).not.toBeInTheDocument();
  });

  it("does not show a count badge when no filters are active", () => {
    render(
      <FilterBar
        state={emptyFilterState()}
        onChange={() => {}}
        onReset={() => {}}
        availableStates={availableStates}
      />,
    );

    const filtersButton = screen.getByRole("button", { name: /^Filters/ });
    expect(filtersButton.textContent).not.toContain("1");
  });

  it("shows an active-count badge on the Filters button when filters are active", () => {
    const state: FilterState = { ...emptyFilterState(), states: ["CA"], missingHealthSystemOnly: true };
    render(
      <FilterBar
        state={state}
        onChange={() => {}}
        onReset={() => {}}
        availableStates={availableStates}
      />,
    );

    const filtersButton = screen.getByRole("button", { name: /^Filters/ });
    // Two active categories (State + Conflicts) → badge shows "2".
    expect(filtersButton.textContent).toContain("2");
  });

  it("clicking the Filters button opens the collapsible panel with all controls", async () => {
    const user = userEvent.setup();
    render(
      <FilterBar
        state={emptyFilterState()}
        onChange={() => {}}
        onReset={() => {}}
        availableStates={availableStates}
      />,
    );

    const filtersButton = screen.getByRole("button", { name: /^Filters/ });
    expect(filtersButton).toHaveAttribute("aria-expanded", "false");

    await user.click(filtersButton);

    // Panel is now open — toolbar role appears with all controls.
    expect(filtersButton).toHaveAttribute("aria-expanded", "true");
    const toolbar = screen.getByRole("toolbar", { name: "Table filters" });
    expect(toolbar).toBeInTheDocument();
    expect(within(toolbar).getByRole("button", { name: /^State/ })).toBeInTheDocument();
    expect(within(toolbar).getByRole("button", { name: /Missing System/ })).toBeInTheDocument();
    expect(within(toolbar).queryByRole("button", { name: /Relationship/ })).not.toBeInTheDocument();
    expect(within(toolbar).getByRole("group", { name: "System footprint" })).toBeInTheDocument();
  });

  it("clicking the Filters button again closes the panel", async () => {
    const user = userEvent.setup();
    render(
      <FilterBar
        state={emptyFilterState()}
        onChange={() => {}}
        onReset={() => {}}
        availableStates={availableStates}
      />,
    );

    const filtersButton = screen.getByRole("button", { name: /^Filters/ });
    await user.click(filtersButton);
    expect(screen.getByRole("toolbar", { name: "Table filters" })).toBeInTheDocument();

    await user.click(filtersButton);
    expect(screen.queryByRole("toolbar", { name: "Table filters" })).not.toBeInTheDocument();
  });

  it("all filter functionality works inside the collapsible panel", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FilterBar
        state={emptyFilterState()}
        onChange={onChange}
        onReset={() => {}}
        availableStates={availableStates}
      />,
    );

    // Open the panel.
    await user.click(screen.getByRole("button", { name: /^Filters/ }));

    // Select a state from the State dropdown inside the panel.
    const toolbar = screen.getByRole("toolbar", { name: "Table filters" });
    await user.click(within(toolbar).getByRole("button", { name: /^State/ }));
    const listbox = screen.getByRole("listbox", { name: "State" });
    await user.click(within(listbox).getByText("CA"));

    expect(onChange).toHaveBeenCalledWith({ states: ["CA"] });

    // Toggle a boolean filter (Conflicts) inside the panel.
    await user.click(within(toolbar).getByRole("button", { name: /Missing System/ }));
    expect(onChange).toHaveBeenCalledWith({ missingHealthSystemOnly: true });
  });

  it("Clear All is available in the compact header when filters are active", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    const state: FilterState = { ...emptyFilterState(), states: ["CA"] };
    render(
      <FilterBar
        state={state}
        onChange={() => {}}
        onReset={onReset}
        availableStates={availableStates}
      />,
    );

    const clearAll = screen.getByRole("button", { name: /Clear All/ });
    expect(clearAll).toBeInTheDocument();
    await user.click(clearAll);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("dropdown panel is width-constrained to not overflow the viewport", async () => {
    const user = userEvent.setup();
    render(
      <FilterBar
        state={emptyFilterState()}
        onChange={() => {}}
        onReset={() => {}}
        availableStates={availableStates}
      />,
    );

    // Open the panel then a dropdown.
    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    const toolbar = screen.getByRole("toolbar", { name: "Table filters" });
    await user.click(within(toolbar).getByRole("button", { name: /^State/ }));

    // The dropdown panel element should carry a max-width constraint class.
    const listbox = screen.getByRole("listbox", { name: "State" });
    const panel = listbox.parentElement as HTMLElement;
    expect(panel.className).toContain("max-w-[calc(100vw-1.5rem)]");
  });
});

describe("FilterBar responsive (desktop viewport)", () => {
  const availableStates = ["CA", "NV", "OH"];

  beforeEach(() => {
    // Desktop: matchMedia reports the narrow query as NOT matching.
    stubMatchMedia(false);
  });

  it("renders the full inline toolbar at desktop widths", () => {
    render(
      <FilterBar
        state={emptyFilterState()}
        onChange={() => {}}
        onReset={() => {}}
        availableStates={availableStates}
      />,
    );

    // Full toolbar is visible immediately.
    expect(screen.getByRole("toolbar", { name: "Table filters" })).toBeInTheDocument();
    // The compact Filters button is not rendered.
    expect(screen.queryByRole("button", { name: /^Filters/ })).not.toBeInTheDocument();
    // Advanced triggers are directly visible.
    expect(screen.getByRole("button", { name: /^State/ })).toBeInTheDocument();
  });

  it("Clear All appears inline when filters are active at desktop", () => {
    const state: FilterState = { ...emptyFilterState(), states: ["CA"] };
    render(
      <FilterBar
        state={state}
        onChange={() => {}}
        onReset={() => {}}
        availableStates={availableStates}
      />,
    );

    expect(screen.getByRole("button", { name: /Clear All/ })).toBeInTheDocument();
  });
});

describe("HealthSystemView responsive (narrow viewport, VAL-FILTER-062)", () => {
  beforeEach(() => {
    stubMatchMedia(true);
  });

  it("table is accessible at narrow viewport — filter bar collapses", async () => {
    render(<HealthSystemView />);
    // The table should render (not be pushed off-screen by a giant filter bar).
    await screen.findByRole("table", { name: "Health System View" });
    expect(screen.getByRole("table", { name: "Health System View" })).toBeInTheDocument();
    // Compact Filters button present instead of the always-visible toolbar.
    expect(screen.getByRole("button", { name: /^Filters/ })).toBeInTheDocument();
    expect(screen.queryByRole("toolbar", { name: "Table filters" })).not.toBeInTheDocument();
  });

  it("filtering still works at narrow viewport via the collapsible panel", async () => {
    const user = userEvent.setup();
    render(<HealthSystemView />);
    await screen.findByRole("table", { name: "Health System View" });

    // Open the Filters panel.
    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    const toolbar = screen.getByRole("toolbar", { name: "Table filters" });

    // Select State=CA inside the panel.
    await user.click(within(toolbar).getByRole("button", { name: /^State/ }));
    const listbox = screen.getByRole("listbox", { name: "State" });
    await user.click(within(listbox).getByText("CA"));

    // The table still shows the matching system (Alpine has a CA hospital).
    expect(screen.getByText("Alpine Health Network")).toBeInTheDocument();
  });
});
