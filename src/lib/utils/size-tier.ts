/**
 * Configurable size-tier rules and range buckets for the Health System Size
 * filters.
 *
 * All numeric thresholds live here so they can be hot-swapped without touching
 * UI components (VAL-FILTER-006, VAL-FILTER-007, VAL-FILTER-010, VAL-FILTER-011).
 */

/** A half-open numeric range: [min, max). `max = null` means no upper bound. */
export interface RangeBucket {
  /** Stable id used in filter state and tests. */
  id: string;
  /** Human-readable label shown in the filter dropdown. */
  label: string;
  /** Inclusive lower bound. */
  min: number;
  /** Exclusive upper bound, or null for open-ended ("40+"). */
  max: number | null;
}

/**
 * Hospital-count range buckets for the "Number of hospitals" filter.
 * A system whose canonical hospital count falls in [min, max) matches.
 */
export const HOSPITAL_COUNT_RANGES: RangeBucket[] = [
  { id: "1-5", label: "1-5", min: 1, max: 6 },
  { id: "6-15", label: "6-15", min: 6, max: 16 },
  { id: "16-40", label: "16-40", min: 16, max: 41 },
  { id: "40+", label: "40+", min: 40, max: null },
];

/** Total-beds range buckets for the "Total beds" filter. */
export const TOTAL_BEDS_RANGES: RangeBucket[] = [
  { id: "<250", label: "< 250", min: 0, max: 250 },
  { id: "250-999", label: "250-999", min: 250, max: 1000 },
  { id: "1000-2999", label: "1,000-2,999", min: 1000, max: 3000 },
  { id: "3000+", label: "3,000+", min: 3000, max: null },
];

/** Average-beds range buckets for the "Average beds" filter. */
export const AVERAGE_BEDS_RANGES: RangeBucket[] = [
  { id: "avg-<100", label: "< 100", min: 0, max: 100 },
  { id: "avg-100-249", label: "100-249", min: 100, max: 250 },
  { id: "avg-250-499", label: "250-499", min: 250, max: 500 },
  { id: "avg-500+", label: "500+", min: 500, max: null },
];

/** Largest-hospital-bed-count range buckets. */
export const LARGEST_HOSPITAL_BEDS_RANGES: RangeBucket[] = [
  { id: "largest-<100", label: "< 100", min: 0, max: 100 },
  { id: "largest-100-299", label: "100-299", min: 100, max: 300 },
  { id: "largest-300-599", label: "300-599", min: 300, max: 600 },
  { id: "largest-600+", label: "600+", min: 600, max: null },
];

/** Size tier names in descending order of size. */
export const SIZE_TIER_NAMES = ["Enterprise", "Large", "Mid-Market", "Small"] as const;

/**
 * Configurable size-tier rules. A system matches the first rule whose
 * thresholds are all satisfied. Rules are evaluated top-to-bottom (highest
 * tier first, catch-all "Small" last).
 *
 * Multiple signals: hospital count, total beds, largest hospital bed count,
 * and optionally multi-state presence.
 *
 * A system must meet ALL thresholds on a rule to match it. When
 * `requireMultiState` is true, the system must operate in 2+ states to match
 * that tier.
 *
 * To change classification thresholds or add a new tier, edit only
 * `SIZE_TIER_RULES` below — no other code changes are needed
 * (VAL-EDIT-047, VAL-EDIT-048).
 */
export interface SizeTierRule {
  /** Tier label displayed in the UI badge. */
  name: string;
  /** Minimum canonical hospital count. */
  minHospitals: number;
  /** Minimum total beds across canonical hospitals. */
  minTotalBeds: number;
  /** Minimum bed count of the largest hospital. 0 = no constraint. */
  minLargestHospitalBeds: number;
  /** When true, the system must operate in 2+ states to match (VAL-EDIT-044). */
  requireMultiState?: boolean;
}

export const SIZE_TIER_RULES: SizeTierRule[] = [
  { name: "Enterprise", minHospitals: 40, minTotalBeds: 3000, minLargestHospitalBeds: 0, requireMultiState: true },
  { name: "Large", minHospitals: 16, minTotalBeds: 1000, minLargestHospitalBeds: 0 },
  { name: "Mid-Market", minHospitals: 6, minTotalBeds: 250, minLargestHospitalBeds: 0 },
  { name: "Small", minHospitals: 0, minTotalBeds: 0, minLargestHospitalBeds: 0 },
];

/**
 * Size tier → numeric rank for sorting, derived from `SIZE_TIER_RULES`.
 * The first rule (highest tier) gets the highest rank. Adding or reordering
 * rules automatically updates the rank mapping — no separate maintenance
 * needed (VAL-EDIT-047).
 */
export const SIZE_TIER_RANK: Record<string, number> = Object.fromEntries(
  SIZE_TIER_RULES.map((rule, index) => [rule.name, SIZE_TIER_RULES.length - index]),
);

/**
 * Compute the size tier for a system given its derived metrics.
 *
 * Evaluates `SIZE_TIER_RULES` top-to-bottom and returns the first matching
 * tier name. Returns null only when no rule matches (should not happen with
 * the default rules since "Small" has all-zero thresholds).
 *
 * Signals used:
 *  - `hospitalCount` — number of canonically assigned hospitals
 *  - `totalBeds` — sum of bed counts across canonical hospitals
 *  - `largestHospitalBeds` — max bed count (null treated as 0)
 *  - `isMultiState` — whether the system operates in 2+ states (VAL-EDIT-044)
 */
export function computeSizeTier(metrics: {
  hospitalCount: number;
  totalBeds: number;
  largestHospitalBeds: number | null;
  isMultiState?: boolean;
}): string | null {
  for (const rule of SIZE_TIER_RULES) {
    const largest = metrics.largestHospitalBeds ?? 0;
    const multiStateOk = !rule.requireMultiState || metrics.isMultiState === true;
    if (
      multiStateOk &&
      metrics.hospitalCount >= rule.minHospitals &&
      metrics.totalBeds >= rule.minTotalBeds &&
      largest >= rule.minLargestHospitalBeds
    ) {
      return rule.name;
    }
  }
  return null;
}

/** Check whether a numeric value falls within a range bucket [min, max). */
export function valueInRange(value: number, bucket: RangeBucket): boolean {
  if (value < bucket.min) return false;
  if (bucket.max !== null && value >= bucket.max) return false;
  return true;
}

/** Check whether a value falls in any of the given buckets (OR logic). */
export function valueInAnyRange(value: number, buckets: RangeBucket[]): boolean {
  return buckets.some((b) => valueInRange(value, b));
}

/** Look up range buckets by their ids. */
export function getRangeBucketsByIds(
  ids: string[],
  allBuckets: RangeBucket[],
): RangeBucket[] {
  const idSet = new Set(ids);
  return allBuckets.filter((b) => idSet.has(b.id));
}
