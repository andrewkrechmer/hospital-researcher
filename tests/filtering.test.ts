import { describe, expect, it } from "vitest";

import {
  confidenceMatches,
  facilityTypeMatches,
  normalizeRelationshipType,
  relationshipTypeMatches,
} from "@/lib/filters/filter-config";
import {
  countActiveCategories,
  emptyFilterState,
  hasActiveFilters,
  type FilterState,
} from "@/lib/filters/filter-types";
import {
  filterHealthSystems,
  filterHospitals,
  getMatchingSystemIds,
  getFilteredIndependents,
  hasSystemLevelFilters,
  matchesSearch,
  matchesSystemFilters,
} from "@/lib/filters/filter-logic";
import { getRegionForState, getStatesForRegions } from "@/lib/utils/region-config";
import {
  HOSPITAL_COUNT_RANGES,
  SIZE_TIER_NAMES,
  SIZE_TIER_RULES,
  TOTAL_BEDS_RANGES,
  valueInAnyRange,
  valueInRange,
} from "@/lib/utils/size-tier";
import type { HealthSystemRecord, HospitalRecord } from "@/lib/types";
import { computeHealthSystemMetrics } from "@/lib/utils/metrics";

// ── Test fixture builders ──

let seq = 0;

function makeHospital(overrides: Partial<HospitalRecord> = {}): HospitalRecord {
  seq += 1;
  return {
    id: `h-${seq}`,
    name: `Hospital ${seq}`,
    cmsCcn: null,
    address: null,
    city: null,
    state: "CA",
    zip: null,
    hospitalDomain: `hospital${seq}.org`,
    facilityType: "Acute Care",
    bedCount: 100,
    canonicalHealthSystemId: "hs-1",
    canonicalHealthSystemName: "System One",
    canonicalHealthSystemDomain: "systemone.org",
    canonicalRelationshipType: "owned",
    canonicalConfidence: "high",
    claimCount: 1,
    conflictingClaimCount: 0,
    hasConflictingClaims: false,
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeHealthSystem(overrides: Partial<HealthSystemRecord> = {}): HealthSystemRecord {
  return {
    id: "hs-1",
    name: "System One",
    primaryDomain: "systemone.org",
    websiteUrl: null,
    headquartersCity: null,
    headquartersState: null,
    sizeTier: "Large",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    metrics: computeHealthSystemMetrics([]),
    ...overrides,
  };
}

/** Build a fixture with a multi-state system, a single-state system, and independents. */
function buildFilterFixture() {
  const alpineHospitals = [
    makeHospital({
      id: "h-alpine-1",
      name: "Alpine Summit Medical Center",
      city: "Reno",
      state: "NV",
      hospitalDomain: "alpinesummit.org",
      facilityType: "Acute Care",
      bedCount: 420,
      canonicalHealthSystemId: "hs-alpine",
      canonicalHealthSystemName: "Alpine Health Network",
      canonicalHealthSystemDomain: "alpinehealth.org",
      canonicalRelationshipType: "owned",
      canonicalConfidence: "high",
    }),
    makeHospital({
      id: "h-alpine-2",
      name: "Alpine Valley Hospital",
      city: "Truckee",
      state: "CA",
      hospitalDomain: null,
      facilityType: "Critical Access",
      bedCount: 24,
      canonicalHealthSystemId: "hs-alpine",
      canonicalHealthSystemName: "Alpine Health Network",
      canonicalHealthSystemDomain: "alpinehealth.org",
      canonicalRelationshipType: "member",
      canonicalConfidence: "medium",
      claimCount: 3,
      conflictingClaimCount: 1,
      hasConflictingClaims: true,
    }),
  ];

  const beaconHospitals = [
    makeHospital({
      id: "h-beacon-1",
      name: "Beacon Central Hospital",
      city: "Akron",
      state: "OH",
      facilityType: null,
      bedCount: null,
      canonicalHealthSystemId: "hs-beacon",
      canonicalHealthSystemName: "Beacon Regional Health",
      canonicalHealthSystemDomain: null,
      canonicalRelationshipType: "affiliate",
      canonicalConfidence: "low",
    }),
  ];

  const independents = [
    makeHospital({
      id: "h-ind-1",
      name: "Riverside Community Hospital",
      city: "Fresno",
      state: "CA",
      facilityType: "Psychiatric",
      bedCount: 88,
      canonicalHealthSystemId: null,
      canonicalHealthSystemName: null,
      canonicalHealthSystemDomain: null,
      canonicalConfidence: null,
      canonicalRelationshipType: null,
      claimCount: 0,
      conflictingClaimCount: 0,
      hasConflictingClaims: false,
    }),
    makeHospital({
      id: "h-ind-2",
      name: "Cottonwood Rural Health Center",
      city: "Cottonwood Falls",
      state: "KS",
      hospitalDomain: null,
      facilityType: null,
      bedCount: null,
      canonicalHealthSystemId: null,
      canonicalHealthSystemName: null,
      canonicalHealthSystemDomain: null,
      canonicalConfidence: null,
      canonicalRelationshipType: null,
      claimCount: 0,
      conflictingClaimCount: 0,
      hasConflictingClaims: false,
    }),
  ];

  const healthSystems = [
    makeHealthSystem({
      id: "hs-alpine",
      name: "Alpine Health Network",
      primaryDomain: "alpinehealth.org",
      sizeTier: "Large",
      metrics: computeHealthSystemMetrics(alpineHospitals),
    }),
    makeHealthSystem({
      id: "hs-beacon",
      name: "Beacon Regional Health",
      primaryDomain: null,
      sizeTier: "Small",
      metrics: computeHealthSystemMetrics(beaconHospitals),
    }),
  ];

  return {
    healthSystems,
    hospitals: [...alpineHospitals, ...beaconHospitals, ...independents],
  };
}

// ── Tests ──

describe("region-config", () => {
  it("maps states to regions correctly", () => {
    expect(getRegionForState("CA")).toBe("West");
    expect(getRegionForState("TX")).toBe("South");
    expect(getRegionForState("OH")).toBe("Midwest");
    expect(getRegionForState("NY")).toBe("Northeast");
  });

  it("returns null for unmapped states", () => {
    expect(getRegionForState("XX")).toBeNull();
    expect(getRegionForState(null)).toBeNull();
  });

  it("getStatesForRegions returns all states for selected regions", () => {
    const westStates = getStatesForRegions(["West"]);
    expect(westStates.has("CA")).toBe(true);
    expect(westStates.has("OR")).toBe(true);
    expect(westStates.has("TX")).toBe(false);

    const multiStates = getStatesForRegions(["West", "South"]);
    expect(multiStates.has("CA")).toBe(true);
    expect(multiStates.has("TX")).toBe(true);
    expect(multiStates.has("OH")).toBe(false);
  });
});

describe("size-tier configuration", () => {
  it("has the required hospital count ranges", () => {
    const ids = HOSPITAL_COUNT_RANGES.map((r) => r.id);
    expect(ids).toEqual(["1-5", "6-15", "16-40", "40+"]);
  });

  it("has the required total beds ranges", () => {
    const ids = TOTAL_BEDS_RANGES.map((r) => r.id);
    expect(ids).toEqual(["<250", "250-999", "1000-2999", "3000+"]);
  });

  it("valueInRange works for bounded ranges", () => {
    const bucket = HOSPITAL_COUNT_RANGES[0]!; // 1-5
    expect(valueInRange(1, bucket)).toBe(true);
    expect(valueInRange(5, bucket)).toBe(true);
    expect(valueInRange(6, bucket)).toBe(false);
    expect(valueInRange(0, bucket)).toBe(false);
  });

  it("valueInRange works for open-ended ranges", () => {
    const bucket = HOSPITAL_COUNT_RANGES[3]!; // 40+
    expect(valueInRange(40, bucket)).toBe(true);
    expect(valueInRange(100, bucket)).toBe(true);
    expect(valueInRange(39, bucket)).toBe(false);
  });

  it("valueInAnyRange returns true if any bucket matches", () => {
    const buckets = [HOSPITAL_COUNT_RANGES[0]!, HOSPITAL_COUNT_RANGES[3]!];
    expect(valueInAnyRange(3, buckets)).toBe(true);
    expect(valueInAnyRange(50, buckets)).toBe(true);
    expect(valueInAnyRange(10, buckets)).toBe(false);
  });

  it("size tier rules include Enterprise, Large, Mid-Market, Small", () => {
    expect(SIZE_TIER_NAMES).toContain("Enterprise");
    expect(SIZE_TIER_NAMES).toContain("Large");
    expect(SIZE_TIER_NAMES).toContain("Mid-Market");
    expect(SIZE_TIER_NAMES).toContain("Small");
    expect(SIZE_TIER_RULES.length).toBe(4);
  });
});

describe("filter-config helpers", () => {
  it("normalizeRelationshipType lowercases and replaces underscores", () => {
    expect(normalizeRelationshipType("Joint_Venture")).toBe("joint venture");
    expect(normalizeRelationshipType("Owned")).toBe("owned");
    expect(normalizeRelationshipType(null)).toBeNull();
    expect(normalizeRelationshipType("")).toBeNull();
  });

  it("relationshipTypeMatches is case-insensitive and underscore-insensitive", () => {
    expect(relationshipTypeMatches("joint_venture", "Joint Venture")).toBe(true);
    expect(relationshipTypeMatches("Owned", "owned")).toBe(true);
    expect(relationshipTypeMatches("owned", "Operated")).toBe(false);
    expect(relationshipTypeMatches(null, "Owned")).toBe(false);
  });

  it("facilityTypeMatches handles null as Other", () => {
    expect(facilityTypeMatches(null, "Other")).toBe(true);
    expect(facilityTypeMatches("", "Other")).toBe(true);
    expect(facilityTypeMatches(null, "Acute Care")).toBe(false);
  });

  it("facilityTypeMatches is case-insensitive for exact types", () => {
    expect(facilityTypeMatches("Acute Care", "Acute Care")).toBe(true);
    expect(facilityTypeMatches("acute care", "Acute Care")).toBe(true);
    expect(facilityTypeMatches("Critical Access", "Acute Care")).toBe(false);
  });

  it("facilityTypeMatches treats non-standard types as Other", () => {
    expect(facilityTypeMatches("Specialty", "Other")).toBe(true);
    expect(facilityTypeMatches("Long Term Care", "Other")).toBe(true);
    expect(facilityTypeMatches("Acute Care", "Other")).toBe(false);
  });

  it("confidenceMatches is case-insensitive", () => {
    expect(confidenceMatches("high", "High")).toBe(true);
    expect(confidenceMatches("HIGH", "high")).toBe(true);
    expect(confidenceMatches("medium", "High")).toBe(false);
    expect(confidenceMatches(null, "High")).toBe(false);
  });
});

describe("filter-types", () => {
  it("emptyFilterState has no active filters", () => {
    const state = emptyFilterState();
    expect(hasActiveFilters(state)).toBe(false);
    expect(countActiveCategories(state)).toBe(0);
  });

  it("hasActiveFilters detects each type of filter", () => {
    expect(hasActiveFilters({ ...emptyFilterState(), states: ["CA"] })).toBe(true);
    expect(hasActiveFilters({ ...emptyFilterState(), multiStateMode: "multi" })).toBe(true);
    expect(hasActiveFilters({ ...emptyFilterState(), regions: ["West"] })).toBe(true);
    expect(hasActiveFilters({ ...emptyFilterState(), hospitalCountRanges: ["40+"] })).toBe(true);
    expect(hasActiveFilters({ ...emptyFilterState(), totalBedsRanges: ["3000+"] })).toBe(true);
    expect(hasActiveFilters({ ...emptyFilterState(), sizeTiers: ["Enterprise"] })).toBe(true);
    expect(hasActiveFilters({ ...emptyFilterState(), facilityTypes: ["Acute Care"] })).toBe(true);
    expect(hasActiveFilters({ ...emptyFilterState(), confidenceLevels: ["High"] })).toBe(true);
    expect(hasActiveFilters({ ...emptyFilterState(), conflictingClaimsOnly: true })).toBe(true);
    expect(hasActiveFilters({ ...emptyFilterState(), missingHealthSystemOnly: true })).toBe(true);
    expect(hasActiveFilters({ ...emptyFilterState(), missingDomainOnly: true })).toBe(true);
    expect(hasActiveFilters({ ...emptyFilterState(), relationshipTypes: ["Owned"] })).toBe(true);
    expect(hasActiveFilters({ ...emptyFilterState(), searchTerm: "test" })).toBe(true);
  });

  it("countActiveCategories counts each category once", () => {
    const state: FilterState = {
      ...emptyFilterState(),
      states: ["CA", "TX"],
      facilityTypes: ["Acute Care", "Critical Access"],
      conflictingClaimsOnly: true,
      searchTerm: "test",
    };
    expect(countActiveCategories(state)).toBe(4);
  });
});

describe("filter-logic: hospital-level filters", () => {
  const fixture = buildFilterFixture();

  it("state filter applies by exact hospital state (VAL-FILTER-001)", () => {
    const state = { ...emptyFilterState(), states: ["CA"] };
    const result = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    const states = new Set(result.map((h) => h.state));
    expect(states.has("CA")).toBe(true);
    expect(states.has("NV")).toBe(false);
    expect(states.has("OH")).toBe(false);
    expect(states.has("KS")).toBe(false);
  });

  it("state filter supports multiple selections with OR (VAL-FILTER-002)", () => {
    const state = { ...emptyFilterState(), states: ["CA", "TX"] };
    const result = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    // CA hospitals should be present, non-CA/non-TX should not
    for (const h of result) {
      expect(["CA", "TX"]).toContain(h.state);
    }
    expect(result.some((h) => h.state === "CA")).toBe(true);
  });

  it("region filter groups states correctly (VAL-FILTER-004)", () => {
    const state = { ...emptyFilterState(), regions: ["West"] };
    const result = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    // West includes CA, NV, OR, WA, etc.
    for (const h of result) {
      expect(getRegionForState(h.state)).toBe("West");
    }
    expect(result.some((h) => h.state === "CA")).toBe(true);
    expect(result.some((h) => h.state === "NV")).toBe(true);
    expect(result.some((h) => h.state === "OH")).toBe(false);
  });

  it("geography state + region combine with AND (VAL-FILTER-005)", () => {
    // CA is in West, OH is in Midwest — selecting CA + West should only show CA
    const state = { ...emptyFilterState(), states: ["CA"], regions: ["West"] };
    const result = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    for (const h of result) {
      expect(h.state).toBe("CA");
    }

    // CA + Midwest should produce no results (CA is not in Midwest)
    const state2 = { ...emptyFilterState(), states: ["CA"], regions: ["Midwest"] };
    const result2 = filterHospitals(fixture.hospitals, fixture.healthSystems, state2);
    expect(result2).toHaveLength(0);
  });

  it("facility type multi-select with OR logic (VAL-FILTER-012, VAL-FILTER-013)", () => {
    const state = { ...emptyFilterState(), facilityTypes: ["Acute Care", "Critical Access"] };
    const result = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    for (const h of result) {
      expect(h.facilityType === "Acute Care" || h.facilityType === "Critical Access").toBe(true);
    }
    expect(result.some((h) => h.facilityType === "Acute Care")).toBe(true);
    expect(result.some((h) => h.facilityType === "Critical Access")).toBe(true);
  });

  it("facility type handles missing values gracefully (VAL-FILTER-014)", () => {
    // When "Acute Care" is selected, hospitals with null facility type are hidden
    const state = { ...emptyFilterState(), facilityTypes: ["Acute Care"] };
    const result = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    for (const h of result) {
      expect(h.facilityType).not.toBeNull();
    }

    // When "Other" is selected, null facility types match
    const stateOther = { ...emptyFilterState(), facilityTypes: ["Other"] };
    const resultOther = filterHospitals(fixture.hospitals, fixture.healthSystems, stateOther);
    expect(resultOther.some((h) => h.facilityType === null)).toBe(true);
    expect(resultOther.some((h) => h.facilityType === "Acute Care")).toBe(false);
  });

  it("confidence filter applies canonical confidence (VAL-FILTER-015)", () => {
    const state = { ...emptyFilterState(), confidenceLevels: ["High"] };
    const result = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    for (const h of result) {
      expect(h.canonicalConfidence?.toLowerCase()).toBe("high");
    }
  });

  it("confidence filter supports multiple selections with OR", () => {
    const state = { ...emptyFilterState(), confidenceLevels: ["High", "Medium"] };
    const result = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    for (const h of result) {
      expect(["high", "medium"]).toContain(h.canonicalConfidence?.toLowerCase());
    }
  });

  it("conflicting claims filter surfaces hospitals with competing evidence (VAL-FILTER-016)", () => {
    const state = { ...emptyFilterState(), conflictingClaimsOnly: true };
    const result = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    for (const h of result) {
      expect(h.hasConflictingClaims).toBe(true);
    }
  });

  it("missing health system filter surfaces independent hospitals (VAL-FILTER-017)", () => {
    const state = { ...emptyFilterState(), missingHealthSystemOnly: true };
    const result = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    for (const h of result) {
      expect(h.canonicalHealthSystemId).toBeNull();
    }
  });

  it("missing domain filter surfaces hospitals without domains (VAL-FILTER-018)", () => {
    const state = { ...emptyFilterState(), missingDomainOnly: true };
    const result = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    for (const h of result) {
      expect(!h.hospitalDomain || h.hospitalDomain.trim() === "").toBe(true);
    }
  });

  it("relationship filter with all configured values (VAL-FILTER-019)", () => {
    const state = { ...emptyFilterState(), relationshipTypes: ["Owned"] };
    const result = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    for (const h of result) {
      expect(normalizeRelationshipType(h.canonicalRelationshipType)).toBe("owned");
    }
  });

  it("relationship filter supports multiple selections with OR", () => {
    const state = { ...emptyFilterState(), relationshipTypes: ["Owned", "Member"] };
    const result = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    for (const h of result) {
      const normalized = normalizeRelationshipType(h.canonicalRelationshipType);
      expect(["owned", "member"]).toContain(normalized);
    }
  });

  it("independent treated as relationship state (VAL-FILTER-020)", () => {
    const state = { ...emptyFilterState(), relationshipTypes: ["Independent"] };
    const result = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    for (const h of result) {
      expect(h.canonicalHealthSystemId).toBeNull();
    }
    // Should not show hospitals with a definitive relationship type
    expect(result.some((h) => h.canonicalHealthSystemId !== null)).toBe(false);
  });

  it("unclear handles null/empty values (VAL-FILTER-021)", () => {
    const state = { ...emptyFilterState(), relationshipTypes: ["Unclear"] };
    const result = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    for (const h of result) {
      const normalized = normalizeRelationshipType(h.canonicalRelationshipType);
      expect(normalized === null || normalized === "unclear").toBe(true);
    }
    // Should not show hospitals with a definitive relationship type
    expect(result.some((h) => {
      const n = normalizeRelationshipType(h.canonicalRelationshipType);
      return n !== null && n !== "unclear";
    })).toBe(false);
  });
});

describe("filter-logic: system-level filters", () => {
  const fixture = buildFilterFixture();

  it("multi-state filter hides single-state systems (VAL-FILTER-003)", () => {
    const state: FilterState = { ...emptyFilterState(), multiStateMode: "multi" };
    const result = filterHealthSystems(fixture.healthSystems, fixture.hospitals, state);
    // Alpine has hospitals in NV and CA (multi-state), Beacon has only OH (single-state)
    const names = result.map((s) => s.name);
    expect(names).toContain("Alpine Health Network");
    expect(names).not.toContain("Beacon Regional Health");
  });

  it("single-state filter hides multi-state systems (VAL-FILTER-003)", () => {
    const state: FilterState = { ...emptyFilterState(), multiStateMode: "single" };
    const result = filterHealthSystems(fixture.healthSystems, fixture.hospitals, state);
    const names = result.map((s) => s.name);
    expect(names).toContain("Beacon Regional Health");
    expect(names).not.toContain("Alpine Health Network");
  });

  it("hospital count range filter (VAL-FILTER-006)", () => {
    // Alpine has 2 hospitals, Beacon has 1 — both in 1-5 range
    const state = { ...emptyFilterState(), hospitalCountRanges: ["1-5"] };
    const result = filterHealthSystems(fixture.healthSystems, fixture.hospitals, state);
    expect(result.length).toBe(2);

    // 40+ should match none
    const state40 = { ...emptyFilterState(), hospitalCountRanges: ["40+"] };
    const result40 = filterHealthSystems(fixture.healthSystems, fixture.hospitals, state40);
    expect(result40).toHaveLength(0);
  });

  it("total beds range filter (VAL-FILTER-007)", () => {
    // Alpine total beds = 444, Beacon total beds = 0 (null bed count)
    const state = { ...emptyFilterState(), totalBedsRanges: ["250-999"] };
    const result = filterHealthSystems(fixture.healthSystems, fixture.hospitals, state);
    const names = result.map((s) => s.name);
    expect(names).toContain("Alpine Health Network");
    expect(names).not.toContain("Beacon Regional Health");
  });

  it("average beds range filter (VAL-FILTER-008)", () => {
    // Alpine avg = 222 (444/2), Beacon avg = null (no beds reported)
    const state = { ...emptyFilterState(), averageBedsRanges: ["avg-100-249"] };
    const filteredHospitals = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    const result = filterHealthSystems(fixture.healthSystems, filteredHospitals, state);
    const names = result.map((s) => s.name);
    expect(names).toContain("Alpine Health Network");
    expect(names).not.toContain("Beacon Regional Health"); // null avg excluded
  });

  it("largest hospital bed count range filter (VAL-FILTER-009)", () => {
    // Alpine largest = 420, Beacon largest = null
    const state = { ...emptyFilterState(), largestHospitalBedsRanges: ["largest-300-599"] };
    const filteredHospitals = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    const result = filterHealthSystems(fixture.healthSystems, filteredHospitals, state);
    const names = result.map((s) => s.name);
    expect(names).toContain("Alpine Health Network");
    expect(names).not.toContain("Beacon Regional Health");
  });

  it("size tier filter (VAL-FILTER-010)", () => {
    const state = { ...emptyFilterState(), sizeTiers: ["Large"] };
    const result = filterHealthSystems(fixture.healthSystems, fixture.hospitals, state);
    const names = result.map((s) => s.name);
    expect(names).toContain("Alpine Health Network");
    expect(names).not.toContain("Beacon Regional Health");
  });

  it("matchesSystemFilters uses original metrics", () => {
    const alpine = fixture.healthSystems.find((s) => s.id === "hs-alpine")!;
    // Alpine has 2 hospitals, 2 states
    expect(matchesSystemFilters(alpine, { ...emptyFilterState(), multiStateMode: "multi" })).toBe(true);
    expect(matchesSystemFilters(alpine, { ...emptyFilterState(), multiStateMode: "single" })).toBe(false);
    expect(matchesSystemFilters(alpine, { ...emptyFilterState(), hospitalCountRanges: ["1-5"] })).toBe(true);
    expect(matchesSystemFilters(alpine, { ...emptyFilterState(), hospitalCountRanges: ["40+"] })).toBe(false);
  });

  it("hasSystemLevelFilters detects system-level filters", () => {
    expect(hasSystemLevelFilters(emptyFilterState())).toBe(false);
    expect(hasSystemLevelFilters({ ...emptyFilterState(), multiStateMode: "multi" })).toBe(true);
    expect(hasSystemLevelFilters({ ...emptyFilterState(), hospitalCountRanges: ["1-5"] })).toBe(true);
    expect(hasSystemLevelFilters({ ...emptyFilterState(), sizeTiers: ["Small"] })).toBe(true);
    expect(hasSystemLevelFilters({ ...emptyFilterState(), states: ["CA"] })).toBe(false);
  });
});

describe("filter-logic: combinations", () => {
  const fixture = buildFilterFixture();

  it("multiple filters AND across categories (VAL-FILTER-047)", () => {
    const state: FilterState = {
      ...emptyFilterState(),
      states: ["CA"],
      facilityTypes: ["Critical Access"],
    };
    const result = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    // Only Alpine Valley (CA, Critical Access) should match
    for (const h of result) {
      expect(h.state).toBe("CA");
      expect(h.facilityType).toBe("Critical Access");
    }
  });

  it("multiple filters within same category use OR (VAL-FILTER-048)", () => {
    const state = { ...emptyFilterState(), states: ["CA", "NV"] };
    const result = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    for (const h of result) {
      expect(["CA", "NV"]).toContain(h.state);
    }
    expect(result.some((h) => h.state === "CA")).toBe(true);
    expect(result.some((h) => h.state === "NV")).toBe(true);
  });

  it("search combined with filters applies AND (VAL-FILTER-049)", () => {
    const state: FilterState = {
      ...emptyFilterState(),
      states: ["CA"],
      searchTerm: "alpine",
    };
    const result = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    for (const h of result) {
      expect(h.state).toBe("CA");
      expect(h.name.toLowerCase()).toContain("alpine");
    }
  });

  it("conflicting filter combos produce empty results gracefully (VAL-FILTER-050)", () => {
    // No Rehabilitation hospitals in CA or KS in the fixture — impossible combo
    const impossibleState: FilterState = {
      ...emptyFilterState(),
      states: ["CA", "KS"],
      facilityTypes: ["Rehabilitation"],
    };
    const result = filterHospitals(fixture.hospitals, fixture.healthSystems, impossibleState);
    // No Rehabilitation hospitals in CA or KS in the fixture
    expect(result).toHaveLength(0);
  });

  it("filter order does not affect result set (VAL-FILTER-051)", () => {
    // Apply state first, then facility type
    const state1 = { ...emptyFilterState(), states: ["CA"], facilityTypes: ["Acute Care"] };
    const result1 = filterHospitals(fixture.hospitals, fixture.healthSystems, state1);

    // Apply facility type first, then state (same state object, but test commutativity)
    const state2 = { ...emptyFilterState(), facilityTypes: ["Acute Care"], states: ["CA"] };
    const result2 = filterHospitals(fixture.hospitals, fixture.healthSystems, state2);

    expect(result1.map((h) => h.id).sort()).toEqual(result2.map((h) => h.id).sort());
  });

  it("removing filters in any order leaves remaining active (VAL-FILTER-052)", () => {
    // Start with two filters
    const bothFilters = { ...emptyFilterState(), states: ["CA"], facilityTypes: ["Acute Care"] };
    const bothResult = filterHospitals(fixture.hospitals, fixture.healthSystems, bothFilters);

    // Remove facility type, keep state
    const stateOnly = { ...emptyFilterState(), states: ["CA"] };
    const stateResult = filterHospitals(fixture.hospitals, fixture.healthSystems, stateOnly);

    // Remove state, keep facility type
    const facilityOnly = { ...emptyFilterState(), facilityTypes: ["Acute Care"] };
    const facilityResult = filterHospitals(fixture.hospitals, fixture.healthSystems, facilityOnly);

    // State-only result should be a superset of both-filters result
    expect(stateResult.length).toBeGreaterThanOrEqual(bothResult.length);
    // Facility-only result should be a superset of both-filters result
    expect(facilityResult.length).toBeGreaterThanOrEqual(bothResult.length);
    // No filters should show everything
    const noFilters = filterHospitals(fixture.hospitals, fixture.healthSystems, emptyFilterState());
    expect(noFilters.length).toBeGreaterThanOrEqual(stateResult.length);
    expect(noFilters.length).toBeGreaterThanOrEqual(facilityResult.length);
  });
});

describe("filter-logic: search", () => {
  const fixture = buildFilterFixture();

  it("search filters by hospital name (VAL-FILTER-037)", () => {
    const result = fixture.hospitals.filter((h) => matchesSearch(h, "Alpine Summit"));
    expect(result.some((h) => h.name === "Alpine Summit Medical Center")).toBe(true);
    expect(result.every((h) => h.name.toLowerCase().includes("alpine summit"))).toBe(true);
  });

  it("search filters by health system name (VAL-FILTER-038)", () => {
    const result = fixture.hospitals.filter((h) => matchesSearch(h, "Alpine Health"));
    expect(result.every((h) => h.canonicalHealthSystemName?.toLowerCase().includes("alpine health"))).toBe(true);
  });

  it("search filters by domain (VAL-FILTER-039)", () => {
    const result = fixture.hospitals.filter((h) => matchesSearch(h, "alpinesummit"));
    expect(result.some((h) => h.hospitalDomain === "alpinesummit.org")).toBe(true);
  });

  it("search filters by city (VAL-FILTER-040)", () => {
    const result = fixture.hospitals.filter((h) => matchesSearch(h, "Reno"));
    expect(result.some((h) => h.city === "Reno")).toBe(true);
  });

  it("search filters by state (VAL-FILTER-041)", () => {
    const result = fixture.hospitals.filter((h) => matchesSearch(h, "NV"));
    expect(result.every((h) => h.state === "NV")).toBe(true);
  });

  it("search filters by CMS/CCN (VAL-FILTER-042)", () => {
    const hospital = makeHospital({ cmsCcn: "500001", name: "Test Hospital" });
    expect(matchesSearch(hospital, "500001")).toBe(true);
    expect(matchesSearch(hospital, "50000")).toBe(true);
  });

  it("search is case-insensitive and trimmed (VAL-FILTER-043, VAL-FILTER-060)", () => {
    expect(matchesSearch(fixture.hospitals[0]!, "  ALPINE  ")).toBe(true);
    expect(matchesSearch(fixture.hospitals[0]!, "alpine")).toBe(true);
  });

  it("search handles special characters safely (VAL-FILTER-060)", () => {
    const hospital = makeHospital({ name: "St. Mary's Hospital & Clinic" });
    expect(matchesSearch(hospital, "St. Mary's")).toBe(true);
    expect(matchesSearch(hospital, "& Clinic")).toBe(true);
    expect(matchesSearch(hospital, "-")).toBe(false); // No hyphen in name
  });

  it("search with no matches returns false (VAL-FILTER-045)", () => {
    expect(matchesSearch(fixture.hospitals[0]!, "zzznonexistent")).toBe(false);
  });

  it("empty search matches everything", () => {
    for (const h of fixture.hospitals) {
      expect(matchesSearch(h, "")).toBe(true);
    }
  });
});

describe("filter-logic: system-level + hospital-level interaction", () => {
  const fixture = buildFilterFixture();

  it("system-level filters exclude independents (VAL-CROSS-009)", () => {
    const state = { ...emptyFilterState(), hospitalCountRanges: ["1-5"] };
    const result = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    // Independents should be excluded when system-level filters are active
    expect(result.every((h) => h.canonicalHealthSystemId !== null)).toBe(true);
  });

  it("system-level + hospital-level filters compose correctly", () => {
    const state: FilterState = {
      ...emptyFilterState(),
      hospitalCountRanges: ["1-5"],
      states: ["CA"],
    };
    const result = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    // Only hospitals in CA that belong to a system with 1-5 hospitals
    for (const h of result) {
      expect(h.state).toBe("CA");
      expect(h.canonicalHealthSystemId).not.toBeNull();
    }
  });

  it("filterHealthSystems only shows systems with matching hospitals", () => {
    const state = { ...emptyFilterState(), states: ["OH"] };
    const filteredHospitals = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    const systems = filterHealthSystems(fixture.healthSystems, filteredHospitals, state);
    // Only Beacon (has a hospital in OH) should appear
    expect(systems.some((s) => s.name === "Beacon Regional Health")).toBe(true);
    expect(systems.some((s) => s.name === "Alpine Health Network")).toBe(false);
  });

  it("getFilteredIndependents returns hospitals with no system", () => {
    const state = { ...emptyFilterState(), missingHealthSystemOnly: true };
    const filteredHospitals = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    const independents = getFilteredIndependents(filteredHospitals);
    expect(independents.length).toBe(2);
    expect(independents.every((h) => h.canonicalHealthSystemId === null)).toBe(true);
  });

  it("getMatchingSystemIds returns null when no system-level filters active", () => {
    const state = emptyFilterState();
    expect(getMatchingSystemIds(fixture.healthSystems, state)).toBeNull();
  });

  it("getMatchingSystemIds returns correct set when filters active", () => {
    const state = { ...emptyFilterState(), sizeTiers: ["Large"] };
    const result = getMatchingSystemIds(fixture.healthSystems, state);
    expect(result).not.toBeNull();
    expect(result!.has("hs-alpine")).toBe(true);
    expect(result!.has("hs-beacon")).toBe(false);
  });
});

describe("filter-logic: consistency across views (VAL-FILTER-058)", () => {
  const fixture = buildFilterFixture();

  it("same filters produce consistent hospital sets in both views", () => {
    const state: FilterState = {
      ...emptyFilterState(),
      states: ["CA"],
      facilityTypes: ["Acute Care"],
    };

    // Hospital View: all hospitals matching filters
    const hospitalView = filterHospitals(fixture.hospitals, fixture.healthSystems, state);

    // Health System View: filter systems, then their hospitals should be the same set
    const filteredHospitals = filterHospitals(fixture.hospitals, fixture.healthSystems, state);
    const systems = filterHealthSystems(fixture.healthSystems, filteredHospitals, state);

    // Collect all hospitals from visible systems
    const systemHospitalIds = new Set<string>();
    for (const system of systems) {
      for (const h of filteredHospitals) {
        if (h.canonicalHealthSystemId === system.id) {
          systemHospitalIds.add(h.id);
        }
      }
    }

    // Non-independent hospitals in Hospital View should match those in Health System View
    const hospitalViewNonIndependent = hospitalView
      .filter((h) => h.canonicalHealthSystemId !== null)
      .map((h) => h.id)
      .sort();

    expect(Array.from(systemHospitalIds).sort()).toEqual(hospitalViewNonIndependent);
  });
});
