/**
 * Region-to-state mappings for the Geography region filter.
 *
 * Configurable: change the mappings here and the filter options/results update
 * without any UI component changes (VAL-FILTER-004, VAL-FILTER-011).
 *
 * Keys are region display names; values are arrays of state codes (two-letter
 * abbreviations, uppercased) that belong to that region.
 */

export interface RegionDefinition {
  /** Display name shown in the filter dropdown. */
  name: string;
  /** State codes belonging to this region. */
  states: string[];
}

/**
 * The canonical region configuration. To add, remove, or reassign states,
 * edit this array — the filter UI derives its options from it automatically.
 */
export const REGIONS: RegionDefinition[] = [
  {
    name: "Northeast",
    states: ["CT", "ME", "MA", "NH", "RI", "VT", "NJ", "NY", "PA"],
  },
  {
    name: "Midwest",
    states: ["IL", "IN", "MI", "OH", "WI", "IA", "KS", "MN", "MO", "NE", "ND", "SD"],
  },
  {
    name: "South",
    states: [
      "DE", "FL", "GA", "MD", "NC", "SC", "VA", "WV",
      "AL", "KY", "MS", "TN", "AR", "LA", "OK", "TX",
    ],
  },
  {
    name: "West",
    states: [
      "AZ", "CO", "ID", "MT", "NV", "NM", "UT", "WY",
      "AK", "CA", "HI", "OR", "WA",
    ],
  },
];

/** Quick lookup: state code → region name. */
const STATE_TO_REGION = new Map<string, string>();
for (const region of REGIONS) {
  for (const state of region.states) {
    STATE_TO_REGION.set(state, region.name);
  }
}

/** Return the region name for a state code, or null if unmapped. */
export function getRegionForState(state: string | null | undefined): string | null {
  if (!state) return null;
  return STATE_TO_REGION.get(state) ?? null;
}

/** Return all state codes that belong to any of the given region names. */
export function getStatesForRegions(regionNames: string[]): Set<string> {
  const states = new Set<string>();
  for (const name of regionNames) {
    const region = REGIONS.find((r) => r.name === name);
    if (region) {
      for (const s of region.states) states.add(s);
    }
  }
  return states;
}
