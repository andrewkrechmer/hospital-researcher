/**
 * Filter state type and related interfaces.
 *
 * The filter state is a plain object so it can be shared across the filter bar,
 * quick chips, and search bar via a single React state hook. All categories
 * use arrays for multi-select (OR within category); boolean toggles use
 * booleans.
 */

/** Multi-state vs single-state toggle. null = no filter. */
export type MultiStateMode = "multi" | "single" | null;

export interface FilterState {
  // ── Geography ──
  /** Selected state codes (e.g. "CA", "TX"). OR within. */
  states: string[];
  /** Multi-state vs single-state toggle. */
  multiStateMode: MultiStateMode;
  /** Selected region names (e.g. "West", "South"). OR within. */
  regions: string[];

  // ── Health System Size ──
  /** Selected hospital-count range bucket ids. OR within. */
  hospitalCountRanges: string[];
  /** Selected total-beds range bucket ids. OR within. */
  totalBedsRanges: string[];
  /** Selected average-beds range bucket ids. OR within. */
  averageBedsRanges: string[];
  /** Selected largest-hospital-beds range bucket ids. OR within. */
  largestHospitalBedsRanges: string[];
  /** Selected size tier names. OR within. */
  sizeTiers: string[];

  // ── Facility Type ──
  /** Selected facility type labels. OR within. */
  facilityTypes: string[];

  // ── Data Quality ──
  /** Selected confidence levels. OR within. */
  confidenceLevels: string[];
  /** Show only hospitals with conflicting claims. */
  conflictingClaimsOnly: boolean;
  /** Show only hospitals with no canonical health system. */
  missingHealthSystemOnly: boolean;
  /** Show only hospitals with no domain. */
  missingDomainOnly: boolean;

  // ── Relationship ──
  /** Selected relationship type labels. OR within. */
  relationshipTypes: string[];

  // ── Search ──
  /** Global search term (trimmed, case-insensitive). Empty = no search. */
  searchTerm: string;
}

/** A filter state with no active filters — the default/initial state. */
export function emptyFilterState(): FilterState {
  return {
    states: [],
    multiStateMode: null,
    regions: [],
    hospitalCountRanges: [],
    totalBedsRanges: [],
    averageBedsRanges: [],
    largestHospitalBedsRanges: [],
    sizeTiers: [],
    facilityTypes: [],
    confidenceLevels: [],
    conflictingClaimsOnly: false,
    missingHealthSystemOnly: false,
    missingDomainOnly: false,
    relationshipTypes: [],
    searchTerm: "",
  };
}

/**
 * Check whether any filter (including search) is active.
 * Used to show/hide the "Clear all" button and determine empty-state messaging.
 */
export function hasActiveFilters(state: FilterState): boolean {
  return (
    state.states.length > 0 ||
    state.multiStateMode !== null ||
    state.regions.length > 0 ||
    state.hospitalCountRanges.length > 0 ||
    state.totalBedsRanges.length > 0 ||
    state.averageBedsRanges.length > 0 ||
    state.largestHospitalBedsRanges.length > 0 ||
    state.sizeTiers.length > 0 ||
    state.facilityTypes.length > 0 ||
    state.confidenceLevels.length > 0 ||
    state.conflictingClaimsOnly ||
    state.missingHealthSystemOnly ||
    state.missingDomainOnly ||
    state.relationshipTypes.length > 0 ||
    state.searchTerm.trim().length > 0
  );
}

/**
 * Count the number of active filter categories (for display purposes).
 * Each non-empty array counts as one active category; each boolean toggle
 * counts as one; the search term counts as one.
 */
export function countActiveCategories(state: FilterState): number {
  let count = 0;
  if (state.states.length > 0) count += 1;
  if (state.multiStateMode !== null) count += 1;
  if (state.regions.length > 0) count += 1;
  if (state.hospitalCountRanges.length > 0) count += 1;
  if (state.totalBedsRanges.length > 0) count += 1;
  if (state.averageBedsRanges.length > 0) count += 1;
  if (state.largestHospitalBedsRanges.length > 0) count += 1;
  if (state.sizeTiers.length > 0) count += 1;
  if (state.facilityTypes.length > 0) count += 1;
  if (state.confidenceLevels.length > 0) count += 1;
  if (state.conflictingClaimsOnly) count += 1;
  if (state.missingHealthSystemOnly) count += 1;
  if (state.missingDomainOnly) count += 1;
  if (state.relationshipTypes.length > 0) count += 1;
  if (state.searchTerm.trim().length > 0) count += 1;
  return count;
}
