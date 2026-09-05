// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  computeHealthSystemMetrics,
  groupHospitalsByHealthSystem,
  normalizeConfidenceLevel,
  selectIndependentHospitals,
} from "@/lib/utils/metrics";

import { makeHospital } from "./fixtures/table-data";

describe("computeHealthSystemMetrics", () => {
  it("aggregates count, beds, average, median, largest hospital and states", () => {
    const metrics = computeHealthSystemMetrics([
      makeHospital({ name: "North Hospital", bedCount: 300, state: "CA" }),
      makeHospital({ name: "South Hospital", bedCount: 100, state: "NV" }),
      makeHospital({ name: "East Hospital", bedCount: 50, state: "CA" }),
    ]);

    expect(metrics.hospitalCount).toBe(3);
    expect(metrics.totalBeds).toBe(450);
    expect(metrics.averageBeds).toBe(150);
    expect(metrics.medianBeds).toBe(100);
    expect(metrics.largestHospitalName).toBe("North Hospital");
    expect(metrics.largestHospitalBeds).toBe(300);
    expect(metrics.states).toEqual(["CA", "NV"]);
  });

  it("returns zero-safe values for a system with no canonical hospitals", () => {
    const metrics = computeHealthSystemMetrics([]);

    expect(metrics.hospitalCount).toBe(0);
    expect(metrics.totalBeds).toBe(0);
    expect(metrics.averageBeds).toBeNull();
    expect(metrics.medianBeds).toBeNull();
    expect(metrics.largestHospitalName).toBeNull();
    expect(metrics.largestHospitalBeds).toBeNull();
    expect(metrics.states).toEqual([]);
    expect(metrics.conflictCount).toBe(0);
    expect(Number.isNaN(metrics.totalBeds)).toBe(false);
  });

  it("averages over hospitals with non-null beds, not total hospital count", () => {
    // VAL-EDIT-021: average = totalBeds / count of hospitals with non-null beds
    const metrics = computeHealthSystemMetrics([
      makeHospital({ bedCount: 300 }),
      makeHospital({ bedCount: null }),
    ]);

    expect(metrics.hospitalCount).toBe(2);
    expect(metrics.totalBeds).toBe(300);
    expect(metrics.hospitalsWithBedCount).toBe(1);
    // 300 / 1 = 300, NOT 300 / 2 = 150
    expect(metrics.averageBeds).toBe(300);
    expect(metrics.medianBeds).toBe(300);
  });

  it("breaks largest-hospital ties by name so the value is deterministic", () => {
    const metrics = computeHealthSystemMetrics([
      makeHospital({ name: "Zephyr Hospital", bedCount: 200 }),
      makeHospital({ name: "Aurora Hospital", bedCount: 200 }),
    ]);

    expect(metrics.largestHospitalName).toBe("Aurora Hospital");
    expect(metrics.largestHospitalBeds).toBe(200);
  });

  it("counts facility types, grouping null types under Unknown", () => {
    // VAL-EDIT-075: null facility types grouped consistently under "Unknown"
    const metrics = computeHealthSystemMetrics([
      makeHospital({ facilityType: "Acute Care" }),
      makeHospital({ facilityType: "Acute Care" }),
      makeHospital({ facilityType: "Critical Access" }),
      makeHospital({ facilityType: null }),
    ]);

    expect(metrics.facilityTypeBreakdown).toEqual([
      { facilityType: "Acute Care", count: 2 },
      { facilityType: "Critical Access", count: 1 },
      { facilityType: "Unknown", count: 1 },
    ]);
  });

  it("summarizes confidence with the dominant level and breaks ties downward", () => {
    const dominant = computeHealthSystemMetrics([
      makeHospital({ canonicalConfidence: "high" }),
      makeHospital({ canonicalConfidence: "high" }),
      makeHospital({ canonicalConfidence: "low" }),
    ]);
    expect(dominant.confidence).toBe("high");
    expect(dominant.confidenceCounts).toEqual({
      high: 2,
      medium: 0,
      low: 1,
      unknown: 0,
    });

    const tied = computeHealthSystemMetrics([
      makeHospital({ canonicalConfidence: "high" }),
      makeHospital({ canonicalConfidence: "low" }),
    ]);
    expect(tied.confidence).toBe("low");
  });

  it("counts hospitals whose claims conflict", () => {
    const metrics = computeHealthSystemMetrics([
      makeHospital({ hasConflictingClaims: true, conflictingClaimCount: 2 }),
      makeHospital({ hasConflictingClaims: false }),
    ]);

    expect(metrics.conflictCount).toBe(1);
  });

  it("reports the most recent hospital update as the system's last activity", () => {
    const metrics = computeHealthSystemMetrics([
      makeHospital({ updatedAt: "2026-01-01T00:00:00.000Z" }),
      makeHospital({ updatedAt: "2026-07-04T00:00:00.000Z" }),
    ]);

    expect(metrics.lastHospitalUpdate).toBe("2026-07-04T00:00:00.000Z");
  });

  // -----------------------------------------------------------------------
  // Edge cases (VAL-EDIT-033 through VAL-EDIT-037, VAL-EDIT-074, VAL-EDIT-075)
  // -----------------------------------------------------------------------

  it("empty system returns zero/empty metrics (VAL-EDIT-033)", () => {
    const metrics = computeHealthSystemMetrics([]);

    expect(metrics.hospitalCount).toBe(0);
    expect(metrics.totalBeds).toBe(0);
    expect(metrics.averageBeds).toBeNull();
    expect(metrics.medianBeds).toBeNull();
    expect(metrics.hospitalsWithBedCount).toBe(0);
    expect(metrics.largestHospitalName).toBeNull();
    expect(metrics.largestHospitalBeds).toBeNull();
    expect(metrics.states).toEqual([]);
    expect(metrics.facilityTypeBreakdown).toEqual([]);
    expect(metrics.confidence).toBe("unknown");
    expect(metrics.conflictCount).toBe(0);
    expect(metrics.lastHospitalUpdate).toBeNull();
  });

  it("single-hospital system has correct metrics (VAL-EDIT-034)", () => {
    const metrics = computeHealthSystemMetrics([
      makeHospital({ name: "Solo Hospital", bedCount: 250, state: "TX", facilityType: "Acute Care" }),
    ]);

    expect(metrics.hospitalCount).toBe(1);
    expect(metrics.totalBeds).toBe(250);
    expect(metrics.averageBeds).toBe(250);
    expect(metrics.medianBeds).toBe(250);
    expect(metrics.hospitalsWithBedCount).toBe(1);
    expect(metrics.largestHospitalName).toBe("Solo Hospital");
    expect(metrics.largestHospitalBeds).toBe(250);
    expect(metrics.states).toEqual(["TX"]);
    expect(metrics.facilityTypeBreakdown).toEqual([
      { facilityType: "Acute Care", count: 1 },
    ]);
  });

  it("single-hospital system with null beds has safe metrics", () => {
    const metrics = computeHealthSystemMetrics([
      makeHospital({ name: "No Beds Hospital", bedCount: null, state: "TX" }),
    ]);

    expect(metrics.hospitalCount).toBe(1);
    expect(metrics.totalBeds).toBe(0);
    expect(metrics.averageBeds).toBeNull();
    expect(metrics.medianBeds).toBeNull();
    expect(metrics.hospitalsWithBedCount).toBe(0);
    expect(metrics.largestHospitalName).toBeNull();
    expect(metrics.largestHospitalBeds).toBeNull();
  });

  it("all-null bed counts system handled without error (VAL-EDIT-035)", () => {
    const metrics = computeHealthSystemMetrics([
      makeHospital({ name: "Hospital A", bedCount: null, state: "CA" }),
      makeHospital({ name: "Hospital B", bedCount: null, state: "NV" }),
      makeHospital({ name: "Hospital C", bedCount: null, state: "CA" }),
    ]);

    expect(metrics.hospitalCount).toBe(3);
    expect(metrics.totalBeds).toBe(0);
    expect(metrics.averageBeds).toBeNull();
    expect(metrics.medianBeds).toBeNull();
    expect(metrics.hospitalsWithBedCount).toBe(0);
    expect(metrics.largestHospitalName).toBeNull();
    expect(metrics.largestHospitalBeds).toBeNull();
    expect(metrics.states).toEqual(["CA", "NV"]);
    // No NaN or Infinity
    expect(Number.isNaN(metrics.totalBeds)).toBe(false);
    expect(Number.isFinite(metrics.totalBeds)).toBe(true);
  });

  it("null bed count excluded from totals but hospital still counted (VAL-EDIT-020)", () => {
    const metrics = computeHealthSystemMetrics([
      makeHospital({ name: "With Beds", bedCount: 200, state: "CA" }),
      makeHospital({ name: "No Beds", bedCount: null, state: "NV" }),
      makeHospital({ name: "More Beds", bedCount: 100, state: "CA" }),
    ]);

    expect(metrics.hospitalCount).toBe(3);
    expect(metrics.totalBeds).toBe(300);
    expect(metrics.hospitalsWithBedCount).toBe(2);
    // average = 300 / 2 = 150 (divides by hospitals with beds, not total)
    expect(metrics.averageBeds).toBe(150);
    // median of [100, 200] = 150
    expect(metrics.medianBeds).toBe(150);
    expect(metrics.largestHospitalName).toBe("With Beds");
    expect(metrics.largestHospitalBeds).toBe(200);
  });

  it("large system (100+ hospitals) computes correctly (VAL-EDIT-036)", () => {
    const hospitals = Array.from({ length: 120 }, (_, i) =>
      makeHospital({
        name: `Hospital ${String(i).padStart(3, "0")}`,
        bedCount: 50 + (i % 50),
        state: `S${i % 10}`,
        facilityType: i % 3 === 0 ? "Acute Care" : "Critical Access",
      }),
    );

    const metrics = computeHealthSystemMetrics(hospitals);

    expect(metrics.hospitalCount).toBe(120);
    expect(metrics.hospitalsWithBedCount).toBe(120);
    // Sum of (50 + i%50) for i=0..119
    // Each value 50..99 repeats: 50 appears 3 times (i=0,50,100), 51 appears 3 times, etc.
    // Actually: values are 50+(i%50) for i=0..119. i%50 cycles 0..49 twice + 0..19.
    // Sum = 2 * sum(50..99) + sum(50..69) = 2 * (50+99)*50/2 + (50+69)*20/2
    // = 2 * 3725 + 1190 = 7450 + 1190 = 8640
    // Wait, let me recalculate: sum of (50 + k) for k=0..49 = 50*50 + sum(0..49) = 2500 + 1225 = 3725
    // Two full cycles: 2 * 3725 = 7450
    // Partial cycle (k=0..19): sum of (50+k) for k=0..19 = 20*50 + sum(0..19) = 1000 + 190 = 1190
    // Total = 7450 + 1190 = 8640
    expect(metrics.totalBeds).toBe(8640);
    // average = 8640 / 120 = 72
    expect(metrics.averageBeds).toBe(72);
    // All 10 states present
    expect(metrics.states).toHaveLength(10);
    expect(metrics.states).toEqual([
      "S0", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9",
    ]);
    // Largest bed count = 50 + 49 = 99
    expect(metrics.largestHospitalBeds).toBe(99);
    // Facility types: 40 Acute Care (i%3==0: 0,3,6,...,117 → 40 items), 80 Critical Access
    expect(metrics.facilityTypeBreakdown).toEqual([
      { facilityType: "Critical Access", count: 80 },
      { facilityType: "Acute Care", count: 40 },
    ]);
  });

  it("multi-state system shows all distinct states (VAL-EDIT-074)", () => {
    const states = ["CA", "NV", "OR", "WA", "AZ", "UT", "ID", "MT", "WY", "CO", "NM"];
    const hospitals = states.map((s) =>
      makeHospital({ name: `Hospital ${s}`, state: s, bedCount: 100 }),
    );

    const metrics = computeHealthSystemMetrics(hospitals);

    expect(metrics.hospitalCount).toBe(11);
    // States are sorted alphabetically
    expect(metrics.states).toEqual([...states].sort());
    expect(metrics.states).toHaveLength(11);
  });

  it("null state excluded from states list", () => {
    const metrics = computeHealthSystemMetrics([
      makeHospital({ name: "Hospital A", state: "CA", bedCount: 100 }),
      makeHospital({ name: "Hospital B", state: null, bedCount: 200 }),
      makeHospital({ name: "Hospital C", state: "NV", bedCount: 50 }),
    ]);

    expect(metrics.states).toEqual(["CA", "NV"]);
    expect(metrics.states).not.toContain(null as unknown as string);
  });

  it("facility type edit shifts breakdown counts (VAL-EDIT-071)", () => {
    // Before edit: 2 Acute Care, 1 Critical Access
    const before = computeHealthSystemMetrics([
      makeHospital({ facilityType: "Acute Care" }),
      makeHospital({ facilityType: "Acute Care" }),
      makeHospital({ facilityType: "Critical Access" }),
    ]);
    expect(before.facilityTypeBreakdown).toEqual([
      { facilityType: "Acute Care", count: 2 },
      { facilityType: "Critical Access", count: 1 },
    ]);

    // After editing one hospital's facility type to "Children's"
    const after = computeHealthSystemMetrics([
      makeHospital({ facilityType: "Acute Care" }),
      makeHospital({ facilityType: "Children's" }),
      makeHospital({ facilityType: "Critical Access" }),
    ]);
    expect(after.facilityTypeBreakdown).toEqual([
      { facilityType: "Acute Care", count: 1 },
      { facilityType: "Children's", count: 1 },
      { facilityType: "Critical Access", count: 1 },
    ]);
  });

  it("editing bed count to null removes contribution but keeps count (VAL-EDIT-070)", () => {
    // Before: bed count 200
    const before = computeHealthSystemMetrics([
      makeHospital({ name: "Hospital A", bedCount: 200, state: "CA" }),
      makeHospital({ name: "Hospital B", bedCount: 100, state: "NV" }),
    ]);
    expect(before.totalBeds).toBe(300);
    expect(before.averageBeds).toBe(150);
    expect(before.hospitalCount).toBe(2);

    // After: bed count set to null
    const after = computeHealthSystemMetrics([
      makeHospital({ name: "Hospital A", bedCount: null, state: "CA" }),
      makeHospital({ name: "Hospital B", bedCount: 100, state: "NV" }),
    ]);
    expect(after.hospitalCount).toBe(2); // still counted
    expect(after.totalBeds).toBe(100); // only Hospital B's beds
    expect(after.hospitalsWithBedCount).toBe(1);
    expect(after.averageBeds).toBe(100); // 100 / 1
    expect(after.medianBeds).toBe(100);
    expect(after.largestHospitalName).toBe("Hospital B");
    expect(after.largestHospitalBeds).toBe(100);
  });

  it("median of even count uses average of two middle values (VAL-EDIT-022)", () => {
    const metrics = computeHealthSystemMetrics([
      makeHospital({ name: "H1", bedCount: 100 }),
      makeHospital({ name: "H2", bedCount: 200 }),
      makeHospital({ name: "H3", bedCount: 300 }),
      makeHospital({ name: "H4", bedCount: 400 }),
    ]);

    // Sorted: [100, 200, 300, 400], median = (200 + 300) / 2 = 250
    expect(metrics.medianBeds).toBe(250);
  });

  it("median of odd count uses middle value", () => {
    const metrics = computeHealthSystemMetrics([
      makeHospital({ name: "H1", bedCount: 100 }),
      makeHospital({ name: "H2", bedCount: 200 }),
      makeHospital({ name: "H3", bedCount: 300 }),
    ]);

    // Sorted: [100, 200, 300], median = 200
    expect(metrics.medianBeds).toBe(200);
  });

  it("only canonical assignments counted, not all claims (VAL-EDIT-037)", () => {
    // This is tested at the data-access layer level (getHealthSystemById),
    // but verify the pure function doesn't double-count: it receives only
    // the canonical hospitals, so non-canonical claims can't inflate counts.
    const metrics = computeHealthSystemMetrics([
      makeHospital({ name: "Canonical Hospital", bedCount: 100, state: "CA" }),
    ]);

    expect(metrics.hospitalCount).toBe(1);
    expect(metrics.totalBeds).toBe(100);
  });

  it("metrics not stored as stale columns - derived at query time (VAL-EDIT-027)", () => {
    // The computeHealthSystemMetrics function is pure: it derives metrics
    // from the hospital array passed in. Changing the array changes the
    // output without any "recalculate" step.
    const hospitals = [
      makeHospital({ name: "H1", bedCount: 100 }),
    ];
    const before = computeHealthSystemMetrics(hospitals);
    expect(before.totalBeds).toBe(100);

    // Simulate a bed count edit
    hospitals[0]!.bedCount = 250;
    const after = computeHealthSystemMetrics(hospitals);
    expect(after.totalBeds).toBe(250);
    expect(after.averageBeds).toBe(250);
  });
});

describe("grouping helpers", () => {
  it("groups hospitals by canonical health system id", () => {
    const hospitals = [
      makeHospital({ id: "a", canonicalHealthSystemId: "hs-1" }),
      makeHospital({ id: "b", canonicalHealthSystemId: "hs-1" }),
      makeHospital({ id: "c", canonicalHealthSystemId: "hs-2" }),
      makeHospital({ id: "d", canonicalHealthSystemId: null }),
    ];

    const grouped = groupHospitalsByHealthSystem(hospitals);

    expect(grouped.get("hs-1")?.map((h) => h.id)).toEqual(["a", "b"]);
    expect(grouped.get("hs-2")?.map((h) => h.id)).toEqual(["c"]);
    expect(grouped.has("null")).toBe(false);
  });

  it("selects hospitals with no canonical health system", () => {
    const hospitals = [
      makeHospital({ id: "a", canonicalHealthSystemId: "hs-1" }),
      makeHospital({ id: "b", canonicalHealthSystemId: null }),
    ];

    expect(selectIndependentHospitals(hospitals).map((h) => h.id)).toEqual([
      "b",
    ]);
  });
});

describe("normalizeConfidenceLevel", () => {
  it("maps recognized values case-insensitively and falls back to unknown", () => {
    expect(normalizeConfidenceLevel("High")).toBe("high");
    expect(normalizeConfidenceLevel(" medium ")).toBe("medium");
    expect(normalizeConfidenceLevel("LOW")).toBe("low");
    expect(normalizeConfidenceLevel(null)).toBe("unknown");
    expect(normalizeConfidenceLevel("")).toBe("unknown");
    expect(normalizeConfidenceLevel("0.82")).toBe("unknown");
  });
});
