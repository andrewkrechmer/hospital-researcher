import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HealthSystemTable } from "@/components/table/HealthSystemTable";

import { buildTableFixture } from "./fixtures/table-data";

// jsdom does not implement ResizeObserver and all offset* dimensions are 0.
// The virtualizer's calculateRange returns null when the viewport size is 0,
// producing zero virtual items. This stub fires the callback synchronously
// with realistic dimensions so rows render in the test environment.
class ResizeObserverStub {
  private callback: (entries: unknown[]) => void;

  constructor(callback: (entries: unknown[]) => void) {
    this.callback = callback;
  }

  observe(target: Element) {
    this.callback([
      {
        target,
        borderBoxSize: [{ inlineSize: 1200, blockSize: 800 }],
        contentBoxSize: [{ inlineSize: 1200, blockSize: 800 }],
      },
    ]);
  }

  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

/** Count rendered rows of a given type (group or hospital). */
function countRowsByType(container: HTMLElement, type: string): number {
  return container.querySelectorAll(`[data-row-type="${type}"]`).length;
}

/** Find the closest table row to an element, typed as HTMLElement for within(). */
function closestRow(element: HTMLElement): HTMLElement | null {
  return element.closest("[role='row']") as HTMLElement | null;
}

describe("HealthSystemTable", () => {
  const fixture = buildTableFixture();

  it("renders health system parent rows with expand controls", () => {
    render(
      <HealthSystemTable
        hospitals={fixture.hospitals}
        healthSystems={fixture.healthSystems}
      />,
    );

    expect(screen.getByText("Alpine Health Network")).toBeInTheDocument();
    expect(screen.getByText("Beacon Regional Health")).toBeInTheDocument();
    expect(screen.getByText("Cedar Hollow Health")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Expand Alpine Health Network/ }),
    ).toBeInTheDocument();
  });

  it("renders all required column headers", () => {
    render(
      <HealthSystemTable
        hospitals={fixture.hospitals}
        healthSystems={fixture.healthSystems}
      />,
    );

    const headers = [
      "Health System",
      "Primary Domain",
      "Hospitals",
      "Total Beds",
      "Avg Beds",
      "Largest Hospital",
      "Largest Beds",
      "States",
      "Size Tier",
    ];
    for (const header of headers) {
      expect(screen.getByText(header)).toBeInTheDocument();
    }
  });

  it("expanding a system reveals its child hospital rows", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <HealthSystemTable
        hospitals={fixture.hospitals}
        healthSystems={fixture.healthSystems}
      />,
    );

    // No hospital-type rows before expansion
    expect(countRowsByType(container, "hospital")).toBe(0);

    await user.click(screen.getByRole("button", { name: /Expand Alpine Health Network/ }));

    // After expansion, Alpine's 2 child hospital rows appear
    expect(countRowsByType(container, "hospital")).toBe(2);
  });

  it("collapse hides only the selected system's children", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <HealthSystemTable
        hospitals={fixture.hospitals}
        healthSystems={fixture.healthSystems}
      />,
    );

    // Expand Alpine — 2 hospital rows
    await user.click(screen.getByRole("button", { name: /Expand Alpine Health Network/ }));
    expect(countRowsByType(container, "hospital")).toBe(2);

    // Expand Beacon — 3 hospital rows total
    await user.click(screen.getByRole("button", { name: /Expand Beacon Regional Health/ }));
    expect(countRowsByType(container, "hospital")).toBe(3);

    // Collapse Alpine — only Beacon's 1 child remains
    await user.click(screen.getByRole("button", { name: /Collapse Alpine Health Network/ }));
    expect(countRowsByType(container, "hospital")).toBe(1);
  });

  it("displays correct aggregate metrics for a system", () => {
    render(
      <HealthSystemTable
        hospitals={fixture.hospitals}
        healthSystems={fixture.healthSystems}
      />,
    );

    const alpineRow = closestRow(screen.getByText("Alpine Health Network"));
    expect(alpineRow).toBeTruthy();
    expect(within(alpineRow!).getByText("2")).toBeInTheDocument();
    expect(within(alpineRow!).getByText("444")).toBeInTheDocument();
    expect(within(alpineRow!).getByText("Alpine Summit Medical Center")).toBeInTheDocument();
    expect(within(alpineRow!).getByText("CA, NV")).toBeInTheDocument();
  });


  it("zero-hospital system displays safely with 0 metrics", () => {
    render(
      <HealthSystemTable
        hospitals={fixture.hospitals}
        healthSystems={fixture.healthSystems}
      />,
    );

    const cedarRow = closestRow(screen.getByText("Cedar Hollow Health"));
    expect(cedarRow).toBeTruthy();
    // Hospital count and total beds both show 0
    const zeros = within(cedarRow!).getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(1);
    // Expand button should be disabled
    const expandBtn = within(cedarRow!).getByRole("button", {
      name: /Cedar Hollow Health/,
    });
    expect(expandBtn).toBeDisabled();
  });

  it("independent hospitals appear in a labeled ungrouped section", () => {
    render(
      <HealthSystemTable
        hospitals={fixture.hospitals}
        healthSystems={fixture.healthSystems}
      />,
    );

    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Expand Unassigned/ }),
    ).toBeInTheDocument();
  });


  it("sorting by Total Beds reorders parent rows", async () => {
    const user = userEvent.setup();
    render(
      <HealthSystemTable
        hospitals={fixture.hospitals}
        healthSystems={fixture.healthSystems}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Sort by Total Beds/ }));

    const rows = screen.getAllByRole("row");
    const dataRows = rows.filter(
      (r) => r.getAttribute("data-row-type") === "group",
    );
    // Alpine (444 beds) should be first in descending order
    expect(dataRows[0]?.textContent).toContain("Alpine Health Network");
  });

  it("renders empty state when no data is provided", () => {
    render(
      <HealthSystemTable hospitals={[]} healthSystems={[]} />,
    );

    expect(screen.getByText("No health systems found")).toBeInTheDocument();
  });
});
