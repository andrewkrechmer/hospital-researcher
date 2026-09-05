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

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FilterBar", () => {
  const availableStates = ["CA", "NV", "OH"];

  it("renders all filter category buttons (VAL-FILTER-056)", () => {
    render(
      <FilterBar
        state={emptyFilterState()}
        onChange={() => {}}
        onReset={() => {}}
        availableStates={availableStates}
      />,
    );

    expect(screen.getByRole("button", { name: /^State/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Region/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hospitals/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Total Beds/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Avg Beds/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Largest Beds/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Size Tier/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Facility Type/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confidence/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Relationship/ })).not.toBeInTheDocument();
  });

  it("does not show Clear All when no filters are active (VAL-FILTER-035)", () => {
    render(
      <FilterBar
        state={emptyFilterState()}
        onChange={() => {}}
        onReset={() => {}}
        availableStates={availableStates}
      />,
    );

    expect(screen.queryByRole("button", { name: /Clear All/ })).not.toBeInTheDocument();
  });

  it("shows Clear All when filters are active", () => {
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

  it("Clear All calls onReset", async () => {
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

    await user.click(screen.getByRole("button", { name: /Clear All/ }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("shows count badge on State button when states are selected", () => {
    const state: FilterState = { ...emptyFilterState(), states: ["CA", "NV"] };
    render(
      <FilterBar
        state={state}
        onChange={() => {}}
        onReset={() => {}}
        availableStates={availableStates}
      />,
    );

    const stateButton = screen.getByRole("button", { name: /^State/ });
    expect(stateButton).toBeInTheDocument();
    // The count badge shows "2"
    expect(stateButton.textContent).toContain("2");
  });

  it("opens State dropdown and shows state options", async () => {
    const user = userEvent.setup();
    render(
      <FilterBar
        state={emptyFilterState()}
        onChange={() => {}}
        onReset={() => {}}
        availableStates={availableStates}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^State/ }));

    // The listbox should appear with state options
    const listbox = screen.getByRole("listbox", { name: "State" });
    expect(listbox).toBeInTheDocument();
    expect(screen.getByText("CA")).toBeInTheDocument();
    expect(screen.getByText("NV")).toBeInTheDocument();
    expect(screen.getByText("OH")).toBeInTheDocument();
  });

  it("selecting a state calls onChange with the state", async () => {
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

    await user.click(screen.getByRole("button", { name: /^State/ }));
    const caLabel = screen.getByText("CA");
    await user.click(caLabel);

    expect(onChange).toHaveBeenCalledWith({ states: ["CA"] });
  });



  it("opens Size Tier dropdown and shows configured tiers (VAL-FILTER-010)", async () => {
    const user = userEvent.setup();
    render(
      <FilterBar
        state={emptyFilterState()}
        onChange={() => {}}
        onReset={() => {}}
        availableStates={availableStates}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Size Tier/ }));

    const listbox = screen.getByRole("listbox", { name: "Size Tier" });
    expect(listbox).toBeInTheDocument();
    expect(screen.getByText("Enterprise")).toBeInTheDocument();
    expect(screen.getByText("Large")).toBeInTheDocument();
    expect(screen.getByText("Mid-Market")).toBeInTheDocument();
    expect(screen.getByText("Small")).toBeInTheDocument();
  });

  it("opens Hospital Count dropdown and shows configured ranges (VAL-FILTER-006)", async () => {
    const user = userEvent.setup();
    render(
      <FilterBar
        state={emptyFilterState()}
        onChange={() => {}}
        onReset={() => {}}
        availableStates={availableStates}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Hospitals/ }));

    const listbox = screen.getByRole("listbox", { name: "Hospitals" });
    expect(listbox).toBeInTheDocument();
    expect(screen.getByText("1-5")).toBeInTheDocument();
    expect(screen.getByText("6-15")).toBeInTheDocument();
    expect(screen.getByText("16-40")).toBeInTheDocument();
    expect(screen.getByText("40+")).toBeInTheDocument();
  });

  it("opens Total Beds dropdown and shows configured ranges (VAL-FILTER-007)", async () => {
    const user = userEvent.setup();
    render(
      <FilterBar
        state={emptyFilterState()}
        onChange={() => {}}
        onReset={() => {}}
        availableStates={availableStates}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Total Beds/ }));

    const listbox = screen.getByRole("listbox", { name: "Total Beds" });
    expect(listbox).toBeInTheDocument();
    expect(screen.getByText("< 250")).toBeInTheDocument();
    expect(screen.getByText("250-999")).toBeInTheDocument();
    expect(screen.getByText("1,000-2,999")).toBeInTheDocument();
    expect(screen.getByText("3,000+")).toBeInTheDocument();
  });

  it("multi-state toggle has All, Multi-state, and Single-state options", () => {
    render(
      <FilterBar
        state={emptyFilterState()}
        onChange={() => {}}
        onReset={() => {}}
        availableStates={availableStates}
      />,
    );

    const group = screen.getByRole("group", { name: "System footprint" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Multi-state" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Single-state" })).toBeInTheDocument();
  });

  it("multi-state toggle calls onChange when clicked", async () => {
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

    await user.click(screen.getByRole("button", { name: "Multi-state" }));
    expect(onChange).toHaveBeenCalledWith({ multiStateMode: "multi" });
  });


  it("State dropdown has a search input for long lists (VAL-FILTER-059)", async () => {
    const user = userEvent.setup();
    render(
      <FilterBar
        state={emptyFilterState()}
        onChange={() => {}}
        onReset={() => {}}
        availableStates={availableStates}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^State/ }));
    expect(screen.getByRole("textbox", { name: "Search State" })).toBeInTheDocument();
  });

  it("dropdown closes on Escape", async () => {
    const user = userEvent.setup();
    render(
      <FilterBar
        state={emptyFilterState()}
        onChange={() => {}}
        onReset={() => {}}
        availableStates={availableStates}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^State/ }));
    expect(screen.getByRole("listbox", { name: "State" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox", { name: "State" })).not.toBeInTheDocument();
  });
});

/** Helper: open the State filter dropdown and click a state option within it. */
async function selectStateInDropdown(user: ReturnType<typeof userEvent.setup>, stateCode: string) {
  const toolbar = screen.getByRole("toolbar", { name: "Table filters" });
  await user.click(within(toolbar).getByRole("button", { name: /^State/ }));
  const listbox = screen.getByRole("listbox", { name: "State" });
  const label = within(listbox).getByText(stateCode);
  await user.click(label);
}

/** Helper: apply a filter combination that produces no results in Hospital View.
 *  State=OH + Conflicts toggle: the only OH hospital (Beacon) has no conflicts. */
async function applyEmptyFilterCombo(user: ReturnType<typeof userEvent.setup>) {
  // Select State=OH
  await selectStateInDropdown(user, "OH");
  // Toggle Conflicts on (scope to the filter toolbar to avoid matching the quick chip)
  const toolbar = screen.getByRole("toolbar", { name: "Table filters" });
  await user.click(within(toolbar).getByRole("button", { name: /Missing System/ }));
}

describe("HealthSystemView with filters", () => {
  it("renders the filter bar (VAL-FILTER-055)", async () => {
    render(<HealthSystemView />);
    await screen.findByRole("table", { name: "Health System View" });
    expect(screen.getByRole("toolbar", { name: "Table filters" })).toBeInTheDocument();
  });

  it("filtering by state reduces visible rows (VAL-FILTER-001)", async () => {
    const user = userEvent.setup();
    render(<HealthSystemView />);
    await screen.findByRole("table", { name: "Health System View" });

    // Open State dropdown and select CA
    await selectStateInDropdown(user, "CA");

    // The table should still be present (Alpine has a CA hospital)
    expect(screen.getByRole("table", { name: "Health System View" })).toBeInTheDocument();
    expect(screen.getByText("Alpine Health Network")).toBeInTheDocument();
  });



  it("filters persist when switching views (VAL-FILTER-036)", async () => {
    const user = userEvent.setup();
    render(<HealthSystemView />);
    await screen.findByRole("table", { name: "Health System View" });

    // Apply a state filter for CA
    await selectStateInDropdown(user, "CA");

    // State button should show count badge (scope to toolbar to avoid quick chip matches)
    const toolbar = screen.getByRole("toolbar", { name: "Table filters" });
    const stateButton = within(toolbar).getByRole("button", { name: /^State/ });
    expect(stateButton.textContent).toContain("1");

    // Switch to Hospital View
    await user.click(screen.getByRole("button", { name: "Hospital View" }));
    await screen.findByRole("table", { name: "Hospital View" });

    // Filter should still be active — state button still shows count
    const toolbarAfter = screen.getByRole("toolbar", { name: "Table filters" });
    const stateButtonAfter = within(toolbarAfter).getByRole("button", { name: /^State/ });
    expect(stateButtonAfter.textContent).toContain("1");

    // Switch back to Health System View
    await user.click(screen.getByRole("button", { name: "Health System View" }));
    await screen.findByRole("table", { name: "Health System View" });

    // Filter still active
    const toolbarFinal = screen.getByRole("toolbar", { name: "Table filters" });
    const stateButtonFinal = within(toolbarFinal).getByRole("button", { name: /^State/ });
    expect(stateButtonFinal.textContent).toContain("1");
  });

  it("Clear All in filter bar removes all filters", async () => {
    const user = userEvent.setup();
    render(<HealthSystemView />);
    await screen.findByRole("table", { name: "Health System View" });

    // Apply a state filter
    await selectStateInDropdown(user, "CA");

    // Clear All should appear
    const clearAll = screen.getByRole("button", { name: /Clear All/ });
    expect(clearAll).toBeInTheDocument();

    // Click Clear All
    await user.click(clearAll);

    // Clear All should disappear
    expect(screen.queryByRole("button", { name: /Clear All/ })).not.toBeInTheDocument();

    // State button should not show count (scope to toolbar)
    const toolbar = screen.getByRole("toolbar", { name: "Table filters" });
    const stateButton = within(toolbar).getByRole("button", { name: /^State/ });
    expect(stateButton.textContent).not.toContain("1");
  });
});

  it("shows empty state when filters produce no results (VAL-FILTER-057)", async () => {
    const user = userEvent.setup();
    render(<HealthSystemView />);
    await screen.findByRole("table", { name: "Health System View" });

    // Switch to Hospital View
    await user.click(screen.getByRole("button", { name: "Hospital View" }));
    await screen.findByRole("table", { name: "Hospital View" });

    // Apply State=OH + Conflicts — the only OH hospital (Beacon) has no conflicts
    await applyEmptyFilterCombo(user);

    // Should show the filter empty state
    expect(screen.getByText("No results match your filters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear all filters" })).toBeInTheDocument();
  });

  it("Clear all filters button restores the table", async () => {
    const user = userEvent.setup();
    render(<HealthSystemView />);
    await screen.findByRole("table", { name: "Health System View" });

    // Switch to Hospital View
    await user.click(screen.getByRole("button", { name: "Hospital View" }));
    await screen.findByRole("table", { name: "Hospital View" });

    // Apply State=OH + Conflicts — produces no results
    await applyEmptyFilterCombo(user);

    // Verify empty state
    expect(screen.getByText("No results match your filters")).toBeInTheDocument();

    // Click Clear all filters
    await user.click(screen.getByRole("button", { name: "Clear all filters" }));

    // Table should be restored
    expect(screen.getByRole("table", { name: "Hospital View" })).toBeInTheDocument();
  });
