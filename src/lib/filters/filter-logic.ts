/**
 * Core client-side filter logic.
 *
 * All filtering is pure functions that operate on the already-loaded
 * `HospitalRecord[]` and `HealthSystemRecord[]` arrays — no network requests
 * (VAL-FILTER-053). AND logic across categories, OR logic within categories
 * (VAL-FILTER-047, VAL-FILTER-048).
 */
import {
  confidenceMatches,
  facilityTypeMatches,
  normalizeRelationshipType,
} from "@/lib/filters/filter-config";
import type { FilterState } from "@/lib/filters/filter-types";
import { getStatesForRegions } from "@/lib/utils/region-config";
import {
  getRangeBucketsByIds,
  valueInAnyRange,
  HOSPITAL_COUNT_RANGES,
  TOTAL_BEDS_RANGES,
  AVERAGE_BEDS_RANGES,
  LARGEST_HOSPITAL_BEDS_RANGES,
} from "@/lib/utils/size-tier";
import type { HealthSystemRecord, HospitalRecord } from "@/lib/types";

// ─── Hospital-level filters ───

/**
 * Check whether a hospital passes the geography filters (state + region).
 * State and region are combined with AND: the hospital's state must be in the
 * selected states (if any) AND in the states covered by the selected regions
 * (if any) (VAL-FILTER-005).
 */
function matchesGeography(hospital: HospitalRecord, state: FilterState): boolean {
  if (state.states.length === 0 && state.regions.length === 0) return true;

  const hospitalState = hospital.state?.trim().toUpperCase() ?? null;
  if (hospitalState === null) return false; // null state never matches geography filters

  // State filter: hospital state must be in the selected set
  if (state.states.length > 0) {
    const stateSet = new Set(state.states.map((s) => s.toUpperCase()));
    if (!stateSet.has(hospitalState)) return false;
  }

  // Region filter: hospital state must belong to a selected region
  if (state.regions.length > 0) {
    const regionStates = getStatesForRegions(state.regions);
    if (!regionStates.has(hospitalState)) return false;
  }

  return true;
}

/** Check whether a hospital passes the facility-type filter (OR within). */
function matchesFacilityType(hospital: HospitalRecord, state: FilterState): boolean {
  if (state.facilityTypes.length === 0) return true;
  return state.facilityTypes.some((ft) => facilityTypeMatches(hospital.facilityType, ft));
}

/**
 * Check whether a hospital passes the data-quality filters.
 * All active data-quality filters must pass (AND within the category, since
 * these are boolean toggles rather than multi-selects).
 */
function matchesDataQuality(hospital: HospitalRecord, state: FilterState): boolean {
  // Confidence (OR within the confidence multi-select)
  if (state.confidenceLevels.length > 0) {
    if (!state.confidenceLevels.some((cl) => confidenceMatches(hospital.canonicalConfidence, cl))) {
      return false;
    }
  }

  // Conflicting claims only
  if (state.conflictingClaimsOnly && !hospital.hasConflictingClaims) {
    return false;
  }

  // Missing health system only
  if (state.missingHealthSystemOnly && (hospital.canonicalHealthSystemId !== null || hospital.isSingleSite)) {
    return false;
  }

  // Missing domain only
  if (state.missingDomainOnly) {
    const domain = hospital.hospitalDomain?.trim() ?? "";
    if (domain !== "") return false;
  }

  return true;
}

/**
 * Check whether a hospital passes the relationship filter (OR within).
 * "Independent" matches canonicalRelationshipType = "Independent" (case-insensitive)
 * and canonicalHealthSystemId = null (VAL-FILTER-020).
 * "Unclear" matches null, empty, or "Unclear" (VAL-FILTER-021).
 */
function matchesRelationship(hospital: HospitalRecord, state: FilterState): boolean {
  if (state.relationshipTypes.length === 0) return true;

  const normalizedRel = normalizeRelationshipType(hospital.canonicalRelationshipType);

  return state.relationshipTypes.some((filterValue) => {
    const filterNormalized = filterValue.trim().toLowerCase();

    if (filterNormalized === "independent") {
      // Independent: explicitly marked OR no system and no relationship
      return normalizedRel === "independent" ||
        (hospital.canonicalHealthSystemId === null && normalizedRel === null);
    }

    if (filterNormalized === "unclear") {
      // Unclear: null, empty, or explicitly "unclear"
      return normalizedRel === null || normalizedRel === "unclear";
    }

    return normalizedRel === filterNormalized;
  });
}

/**
 * Check whether a hospital passes the search term (OR across searchable fields).
 * Search is case-insensitive and trimmed (VAL-FILTER-043, VAL-FILTER-060).
 */
export function matchesSearch(hospital: HospitalRecord, searchTerm: string): boolean {
  const trimmed = searchTerm.trim().toLowerCase();
  if (trimmed === "") return true;

  const fields = [
    hospital.name,
    hospital.canonicalHealthSystemName,
    hospital.hospitalDomain,
    hospital.canonicalHealthSystemDomain,
    hospital.city,
    hospital.state,
    hospital.cmsCcn,
  ];

  return fields.some((field) => {
    if (!field) return false;
    return field.toLowerCase().includes(trimmed);
  });
}

/** Apply all hospital-level filters to a single hospital. */
export function matchesHospitalFilters(hospital: HospitalRecord, state: FilterState): boolean {
  return (
    matchesGeography(hospital, state) &&
    matchesFacilityType(hospital, state) &&
    matchesDataQuality(hospital, state) &&
    matchesRelationship(hospital, state) &&
    matchesSearch(hospital, state.searchTerm)
  );
}

// ─── System-level filters ───

/** Check whether any system-level filter is active. */
export function hasSystemLevelFilters(state: FilterState): boolean {
  return (
    state.multiStateMode !== null ||
    state.hospitalCountRanges.length > 0 ||
    state.totalBedsRanges.length > 0 ||
    state.averageBedsRanges.length > 0 ||
    state.largestHospitalBedsRanges.length > 0 ||
    state.sizeTiers.length > 0
  );
}

/**
 * Check whether a health system passes the system-level filters, using the
 * system's ORIGINAL derived metrics (not the filtered subset).
 *
 * System-level filters use original metrics so that applying a hospital-level
 * filter (e.g. state) does not change which systems match a hospital-count or
 * size-tier filter — only the displayed metrics are recomputed from the
 * filtered hospitals (VAL-FILTER-058).
 */
export function matchesSystemFilters(
  system: HealthSystemRecord,
  state: FilterState,
): boolean {
  const { metrics } = system;

  // Multi-state vs single-state
  if (state.multiStateMode !== null) {
    const isMultiState = metrics.states.length > 1;
    if (state.multiStateMode === "multi" && !isMultiState) return false;
    if (state.multiStateMode === "single" && isMultiState) return false;
  }

  // Hospital count ranges (OR within)
  if (state.hospitalCountRanges.length > 0) {
    const buckets = getRangeBucketsByIds(state.hospitalCountRanges, HOSPITAL_COUNT_RANGES);
    if (!valueInAnyRange(metrics.hospitalCount, buckets)) return false;
  }

  // Total beds ranges (OR within)
  if (state.totalBedsRanges.length > 0) {
    const buckets = getRangeBucketsByIds(state.totalBedsRanges, TOTAL_BEDS_RANGES);
    if (!valueInAnyRange(metrics.totalBeds, buckets)) return false;
  }

  // Average beds ranges (OR within). Empty systems (null average) are excluded.
  if (state.averageBedsRanges.length > 0) {
    if (metrics.averageBeds == null) return false;
    const buckets = getRangeBucketsByIds(state.averageBedsRanges, AVERAGE_BEDS_RANGES);
    if (!valueInAnyRange(metrics.averageBeds, buckets)) return false;
  }

  // Largest hospital beds ranges (OR within). Null largest is excluded.
  if (state.largestHospitalBedsRanges.length > 0) {
    if (metrics.largestHospitalBeds == null) return false;
    const buckets = getRangeBucketsByIds(state.largestHospitalBedsRanges, LARGEST_HOSPITAL_BEDS_RANGES);
    if (!valueInAnyRange(metrics.largestHospitalBeds, buckets)) return false;
  }

  // Size tier (OR within)
  if (state.sizeTiers.length > 0) {
    if (!system.sizeTier || !state.sizeTiers.includes(system.sizeTier)) return false;
  }

  return true;
}

// ─── Combined filtering ───

/**
 * Compute the set of health system IDs that pass the system-level filters.
 * Returns null when no system-level filters are active (meaning all systems
 * pass, including independents).
 */
export function getMatchingSystemIds(
  healthSystems: HealthSystemRecord[],
  state: FilterState,
): Set<string> | null {
  if (!hasSystemLevelFilters(state)) return null;

  const matching = new Set<string>();
  for (const system of healthSystems) {
    if (matchesSystemFilters(system, state)) {
      matching.add(system.id);
    }
  }
  return matching;
}

/**
 * Filter the full hospital list, applying both hospital-level and system-level
 * filters with AND logic across categories and OR logic within categories
 * (VAL-FILTER-047, VAL-FILTER-048, VAL-FILTER-049).
 *
 * System-level filters use the original system metrics. When system-level
 * filters are active, hospitals without a canonical health system (independents)
 * are excluded, and hospitals whose system does not pass the system-level
 * filters are also excluded.
 */
export function filterHospitals(
  hospitals: HospitalRecord[],
  healthSystems: HealthSystemRecord[],
  state: FilterState,
): HospitalRecord[] {
  const matchingSystemIds = getMatchingSystemIds(healthSystems, state);

  return hospitals.filter((hospital) => {
    // Hospital-level filters
    if (!matchesHospitalFilters(hospital, state)) return false;

    // System-level filters
    if (matchingSystemIds !== null) {
      if (hospital.canonicalHealthSystemId === null) return false;
      if (!matchingSystemIds.has(hospital.canonicalHealthSystemId)) return false;
    }

    return true;
  });
}

/**
 * Filter health systems for the Health System View: a system is visible if it
 * passes the system-level filters AND has at least one hospital that passes
 * the hospital-level filters. The returned systems carry their ORIGINAL metrics
 * (the caller recomputes metrics from the filtered hospital subset for display).
 */
export function filterHealthSystems(
  healthSystems: HealthSystemRecord[],
  filteredHospitals: HospitalRecord[],
  state: FilterState,
): HealthSystemRecord[] {
  const hospitalsBySystem = new Map<string, HospitalRecord[]>();
  for (const h of filteredHospitals) {
    if (h.canonicalHealthSystemId === null) continue;
    const list = hospitalsBySystem.get(h.canonicalHealthSystemId);
    if (list) {
      list.push(h);
    } else {
      hospitalsBySystem.set(h.canonicalHealthSystemId, [h]);
    }
  }

  return healthSystems.filter((system) => {
    // Must pass system-level filters
    if (!matchesSystemFilters(system, state)) return false;

    // Must have at least one filtered hospital
    const systemHospitals = hospitalsBySystem.get(system.id);
    if (!systemHospitals || systemHospitals.length === 0) return false;

    return true;
  });
}

/**
 * Get the independent hospitals from a filtered list (those with no canonical
 * health system). Used to build the Independent/Unassigned group in Health
 * System View.
 */
export function getFilteredIndependents(
  filteredHospitals: HospitalRecord[],
): HospitalRecord[] {
  return filteredHospitals.filter((h) => h.canonicalHealthSystemId === null);
}
