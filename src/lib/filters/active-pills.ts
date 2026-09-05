/**
 * Active filter pill computation.
 *
 * Given a {@link FilterState}, produce a list of removable pills — one per
 * active filter category. Each pill carries the partial state patch that
 * removes just that filter, leaving all others intact (VAL-FILTER-032,
 * VAL-FILTER-033).
 */
import type { FilterState } from "@/lib/filters/filter-types";
import { getStateName } from "@/lib/utils/state-names";

/** A single active filter pill. */
export interface ActiveFilterPill {
  /** Stable id for React keys. */
  id: string;
  /** Human-readable label shown on the pill (e.g. "State: California"). */
  label: string;
  /** Partial state patch that removes this filter. */
  removePatch: Partial<FilterState>;
}

/**
 * Format a multi-select pill label. When few values are selected, show them
 * all; when many are selected, show a count (VAL-FILTER-032).
 */
function formatMultiSelect(
  prefix: string,
  values: string[],
  maxShow: number = 2,
  formatter: (v: string) => string = (v) => v,
): string {
  if (values.length <= maxShow) {
    return `${prefix}: ${values.map(formatter).join(", ")}`;
  }
  return `${prefix}: ${values.length} selected`;
}

/**
 * Compute the list of active filter pills from the current filter state.
 * Returns an empty array when no filters (including search) are active.
 */
export function getActivePills(state: FilterState): ActiveFilterPill[] {
  const pills: ActiveFilterPill[] = [];

  // Geography
  if (state.states.length > 0) {
    pills.push({
      id: "states",
      label: formatMultiSelect("State", state.states, 2, (v) => getStateName(v)),
      removePatch: { states: [] },
    });
  }

  if (state.multiStateMode !== null) {
    pills.push({
      id: "multiStateMode",
      label: `Footprint: ${state.multiStateMode === "multi" ? "Multi-state" : "Single-state"}`,
      removePatch: { multiStateMode: null },
    });
  }

  if (state.regions.length > 0) {
    pills.push({
      id: "regions",
      label: formatMultiSelect("Region", state.regions),
      removePatch: { regions: [] },
    });
  }

  // Health System Size
  if (state.hospitalCountRanges.length > 0) {
    pills.push({
      id: "hospitalCountRanges",
      label: formatMultiSelect("Hospitals", state.hospitalCountRanges),
      removePatch: { hospitalCountRanges: [] },
    });
  }

  if (state.totalBedsRanges.length > 0) {
    pills.push({
      id: "totalBedsRanges",
      label: formatMultiSelect("Total Beds", state.totalBedsRanges),
      removePatch: { totalBedsRanges: [] },
    });
  }

  if (state.averageBedsRanges.length > 0) {
    pills.push({
      id: "averageBedsRanges",
      label: formatMultiSelect("Avg Beds", state.averageBedsRanges),
      removePatch: { averageBedsRanges: [] },
    });
  }

  if (state.largestHospitalBedsRanges.length > 0) {
    pills.push({
      id: "largestHospitalBedsRanges",
      label: formatMultiSelect("Largest Beds", state.largestHospitalBedsRanges),
      removePatch: { largestHospitalBedsRanges: [] },
    });
  }

  if (state.sizeTiers.length > 0) {
    pills.push({
      id: "sizeTiers",
      label: formatMultiSelect("Size Tier", state.sizeTiers),
      removePatch: { sizeTiers: [] },
    });
  }

  // Facility Type
  if (state.facilityTypes.length > 0) {
    pills.push({
      id: "facilityTypes",
      label: formatMultiSelect("Facility Type", state.facilityTypes),
      removePatch: { facilityTypes: [] },
    });
  }

  // Data Quality
  if (state.confidenceLevels.length > 0) {
    pills.push({
      id: "confidenceLevels",
      label: formatMultiSelect("Confidence", state.confidenceLevels),
      removePatch: { confidenceLevels: [] },
    });
  }

  if (state.conflictingClaimsOnly) {
    pills.push({
      id: "conflictingClaimsOnly",
      label: "Conflicts",
      removePatch: { conflictingClaimsOnly: false },
    });
  }

  if (state.missingHealthSystemOnly) {
    pills.push({
      id: "missingHealthSystemOnly",
      label: "Missing System",
      removePatch: { missingHealthSystemOnly: false },
    });
  }

  if (state.missingDomainOnly) {
    pills.push({
      id: "missingDomainOnly",
      label: "Missing Domain",
      removePatch: { missingDomainOnly: false },
    });
  }

  // Relationship
  if (state.relationshipTypes.length > 0) {
    pills.push({
      id: "relationshipTypes",
      label: formatMultiSelect("Relationship", state.relationshipTypes),
      removePatch: { relationshipTypes: [] },
    });
  }

  // Search
  if (state.searchTerm.trim().length > 0) {
    pills.push({
      id: "searchTerm",
      label: `Search: \u201C${state.searchTerm.trim()}\u201D`,
      removePatch: { searchTerm: "" },
    });
  }

  return pills;
}
