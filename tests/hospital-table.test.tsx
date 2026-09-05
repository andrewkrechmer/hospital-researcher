import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { HospitalTable } from "@/components/table/HospitalTable";

import { buildTableFixture, makeHospital } from "./fixtures/table-data";
import { ResizeObserverStub } from "./fixtures/virtualizer-stub";

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

/** All visible hospital rows (one per hospital) in DOM order. */
function hospitalRows(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll("[data-row-type='hospital']"),
  ) as HTMLElement[];
}

describe("HospitalTable", () => {
  const fixture = buildTableFixture();

  it("renders one row per hospital with no hierarchy", () => {
    const { container } = render(
      <HospitalTable hospitals={fixture.hospitals} />,
    );
    const rows = hospitalRows(container);
    expect(rows).toHaveLength(fixture.hospitals.length);
    // No group/parent rows in Hospital View
    expect(container.querySelectorAll("[data-row-type='group']")).toHaveLength(0);
  });

  it("renders supported column headers", () => {
    render(<HospitalTable hospitals={fixture.hospitals} />);
    const headers = [
      "Hospital Name",
      "Health System",
      "Health System Domain",
      "Bed Count",
      "CMS/CCN",
      "City",
      "State",
      "ZIP",
    ];
    for (const header of headers) {
      expect(screen.getByText(header)).toBeInTheDocument();
    }
  });

  it("sorts Bed Count numerically, not lexicographically", async () => {
    const user = userEvent.setup();
    const hospitals = [
      makeHospital({ id: "h-20", name: "Twenty Bed", bedCount: 20 }),
      makeHospital({ id: "h-1000", name: "Thousand Bed", bedCount: 1000 }),
      makeHospital({ id: "h-200", name: "Two Hundred Bed", bedCount: 200 }),
    ];
    const { container } = render(<HospitalTable hospitals={hospitals} />);

    // Default order (as provided)
    let names = hospitalRows(container).map((r) => r.textContent);
    expect(names?.[0]).toContain("Twenty Bed");

    // First click: descending (numeric column defaults to desc-first)
    await user.click(screen.getByRole("button", { name: "Sort by Bed Count" }));
    names = hospitalRows(container).map((r) => r.textContent);
    expect(names?.[0]).toContain("Thousand Bed");
    expect(names?.[1]).toContain("Two Hundred Bed");
    expect(names?.[2]).toContain("Twenty Bed");

    // Second click: ascending — 20, 200, 1000 (numeric, not lexicographic)
    await user.click(screen.getByRole("button", { name: "Sort by Bed Count" }));
    names = hospitalRows(container).map((r) => r.textContent);
    expect(names?.[0]).toContain("Twenty Bed");
    expect(names?.[1]).toContain("Two Hundred Bed");
    expect(names?.[2]).toContain("Thousand Bed");
  });


  it("sorts Hospital Name lexically", async () => {
    const user = userEvent.setup();
    const hospitals = [
      makeHospital({ id: "h-z", name: "Zebra Hospital" }),
      makeHospital({ id: "h-a", name: "Apple Hospital" }),
      makeHospital({ id: "h-m", name: "Maple Hospital" }),
    ];
    const { container } = render(<HospitalTable hospitals={hospitals} />);

    await user.click(screen.getByRole("button", { name: "Sort by Hospital Name" }));
    const names = hospitalRows(container).map((r) => r.textContent);
    expect(names?.[0]).toContain("Apple Hospital");
    expect(names?.[1]).toContain("Maple Hospital");
    expect(names?.[2]).toContain("Zebra Hospital");
  });

  it("renders null values as an em dash, not 'undefined' or 'null'", () => {
    const hospital = makeHospital({
      id: "h-nulls",
      name: "Null Fields Hospital",
      cmsCcn: null,
      city: null,
      state: null,
      zip: null,
      hospitalDomain: null,
      facilityType: null,
      bedCount: null,
      canonicalHealthSystemName: null,
      canonicalHealthSystemDomain: null,
      canonicalRelationshipType: null,
      canonicalConfidence: null,
      conflictingClaimCount: 0,
    });
    const { container } = render(<HospitalTable hospitals={[hospital]} />);
    const row = hospitalRows(container)[0]!;
    expect(row.textContent).not.toContain("undefined");
    expect(row.textContent).not.toContain("null");
    // Em dashes are used for empty values
    const dashes = within(row).getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });



  it("renders empty state when no hospitals are provided", () => {
    render(<HospitalTable hospitals={[]} />);
    expect(screen.getByText("No hospitals found")).toBeInTheDocument();
  });
});
