/**
 * Quick filter chip definitions and toggle logic.
 *
 * Each chip maps to one or more fields in {@link FilterState}. Chips and the
 * advanced FilterBar share the same state object, so activating a chip updates
 * the corresponding filter control and vice-versa (VAL-FILTER-031).
 *
 * Chips toggle: clicking an inactive chip activates it; clicking an active chip
 * deactivates it (VAL-FILTER-029). Multiple chips can be active simultaneously
 * with AND logic across categories (VAL-FILTER-030).
 */
import type { FilterState } from "@/lib/filters/filter-types";
import { getStateName } from "@/lib/utils/state-names";

/**
 * A quick filter chip definition. `isActive` checks whether the chip's filter
 * is currently applied; `toggle` returns the state patch to apply/clear it.
 */
export interface QuickChip {
  /** Stable id for React keys and test targeting. */
  id: string;
  /** Human-readable label shown on the chip. */
  label: string;
  /** Whether this chip's filter is currently active. */
  isActive: (state: FilterState) => boolean;
  /** Returns the partial state patch to toggle this chip. */
  toggle: (state: FilterState) => Partial<FilterState>;
}

// ─── Helpers ───

/** Toggle a single value in an array field. */
function toggleArrayValue(
  arr: string[],
  value: string,
): string[] {
  const set = new Set(arr);
  if (set.has(value)) {
    set.delete(value);
  } else {
    set.add(value);
  }
  return Array.from(set);
}

/** Toggle a set of values in an array field (all-or-nothing). */
function toggleArrayValues(
  arr: string[],
  values: string[],
): string[] {
  const set = new Set(arr);
  const allPresent = values.every((v) => set.has(v));
  if (allPresent) {
    for (const v of values) set.delete(v);
  } else {
    for (const v of values) set.add(v);
  }
  return Array.from(set);
}

/** Check whether all given values are present in an array. */
function arrayContainsAll(arr: string[], values: string[]): boolean {
  const set = new Set(arr);
  return values.every((v) => set.has(v));
}

// ─── Fixed (non-state) chips ───

/**
 * The fixed quick filter chips that are always shown.
 *
 * Mappings:
 * - Enterprise → sizeTiers filter (VAL-FILTER-022)
 * - Independent → missingHealthSystemOnly (VAL-FILTER-023)
 * - 40+ Hospitals → hospitalCountRanges "40+" bucket (VAL-FILTER-024)
 * - 1000+ Beds → totalBedsRanges "1000-2999" + "3000+" (VAL-FILTER-025)
 * - Missing Domain → missingDomainOnly (VAL-FILTER-026)
 * - Conflicts → conflictingClaimsOnly (VAL-FILTER-027)
 */
export const FIXED_QUICK_CHIPS: QuickChip[] = [
  {
    id: "enterprise",
    label: "Enterprise",
    isActive: (s) => s.sizeTiers.includes("Enterprise"),
    toggle: (s) => ({ sizeTiers: toggleArrayValue(s.sizeTiers, "Enterprise") }),
  },
  {
    id: "independent",
    label: "Unassigned",
    isActive: (s) => s.missingHealthSystemOnly,
    toggle: (s) => ({ missingHealthSystemOnly: !s.missingHealthSystemOnly }),
  },
  {
    id: "40plus-hospitals",
    label: "40+ Hospitals",
    isActive: (s) => s.hospitalCountRanges.includes("40+"),
    toggle: (s) => ({
      hospitalCountRanges: toggleArrayValue(s.hospitalCountRanges, "40+"),
    }),
  },
  {
    id: "1000plus-beds",
    label: "1000+ Beds",
    isActive: (s) =>
      arrayContainsAll(s.totalBedsRanges, ["1000-2999", "3000+"]),
    toggle: (s) => ({
      totalBedsRanges: toggleArrayValues(s.totalBedsRanges, [
        "1000-2999",
        "3000+",
      ]),
    }),
  },
];

// ─── State chips ───

/**
 * Build a quick filter chip for a single state.
 * The chip label is the full state name (e.g. "California"); the filter value
 * is the two-letter code (e.g. "CA") (VAL-FILTER-028).
 */
export function makeStateChip(stateCode: string): QuickChip {
  return {
    id: `state-${stateCode}`,
    label: getStateName(stateCode),
    isActive: (s) => s.states.includes(stateCode),
    toggle: (s) => ({ states: toggleArrayValue(s.states, stateCode) }),
  };
}

/**
 * Build the full list of quick filter chips: the fixed chips followed by a
 * chip for each available state code (sorted alphabetically).
 */
export function buildQuickChips(availableStates: string[]): QuickChip[] {
  const stateChips = [...availableStates]
    .sort()
    .map((code) => makeStateChip(code));
  return [...FIXED_QUICK_CHIPS, ...stateChips];
}
