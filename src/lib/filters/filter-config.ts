/**
 * Configurable lists for the Facility Type, Relationship, and Confidence
 * filters. The filter UI derives its options from these arrays so adding or
 * removing a value requires no component changes.
 */

/** Facility types shown in the Facility Type multi-select. */
export const FACILITY_TYPES: string[] = [
  "Acute Care",
  "Critical Access",
  "Children's",
  "Psychiatric",
  "Rehabilitation",
  "LTACH",
  "Other",
];

/**
 * Facility types that should be treated as "Other" — null/blank values match
 * when "Other" is selected (VAL-FILTER-014).
 */
export const OTHER_FACILITY_TYPES = new Set<string>(["Other", "Specialty", "Long Term Care"]);

/** Relationship types shown in the Relationship multi-select. */
export const RELATIONSHIP_TYPES: string[] = [
  "Owned",
  "Operated",
  "Member",
  "Affiliate",
  "Joint Venture",
  "Managed",
  "Independent",
  "Unclear",
];

/** Confidence levels shown in the Confidence multi-select. */
export const CONFIDENCE_LEVELS: string[] = ["High", "Medium", "Low"];

/**
 * Normalize a relationship type for matching: lowercase, replace underscores
 * with spaces, trim. "joint_venture" → "joint venture".
 */
export function normalizeRelationshipType(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.trim().toLowerCase().replace(/_/g, " ");
}

/**
 * Normalize a relationship type for display: title-case, replace underscores
 * with spaces. "joint_venture" → "Joint Venture".
 */
export function displayRelationshipType(value: string | null | undefined): string | null {
  const normalized = normalizeRelationshipType(value);
  if (!normalized) return null;
  return normalized.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Check whether a hospital's relationship type matches a filter value.
 * Comparison is case-insensitive and underscore-insensitive.
 */
export function relationshipTypeMatches(
  hospitalValue: string | null | undefined,
  filterValue: string,
): boolean {
  const normalized = normalizeRelationshipType(hospitalValue);
  const filterNormalized = filterValue.trim().toLowerCase();
  return normalized === filterNormalized;
}

/**
 * Check whether a hospital's facility type matches a filter value.
 * When the filter value is "Other", null/blank facility types also match
 * (VAL-FILTER-014), as do any types in OTHER_FACILITY_TYPES.
 */
export function facilityTypeMatches(
  hospitalValue: string | null | undefined,
  filterValue: string,
): boolean {
  if (!hospitalValue || hospitalValue.trim() === "") {
    // Null/blank facility type only matches "Other"
    return filterValue === "Other";
  }
  if (filterValue === "Other") {
    // "Other" matches types not in the primary FACILITY_TYPES list
    return OTHER_FACILITY_TYPES.has(hospitalValue) ||
      !FACILITY_TYPES.includes(hospitalValue);
  }
  return hospitalValue.trim().toLowerCase() === filterValue.trim().toLowerCase();
}

/**
 * Normalize a confidence level for matching.
 */
export function normalizeConfidence(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "high" || trimmed === "medium" || trimmed === "low") return trimmed;
  return null;
}

/**
 * Check whether a hospital's confidence matches a filter value.
 * Comparison is case-insensitive.
 */
export function confidenceMatches(
  hospitalValue: string | null | undefined,
  filterValue: string,
): boolean {
  const normalized = normalizeConfidence(hospitalValue);
  const filterNormalized = filterValue.trim().toLowerCase();
  return normalized === filterNormalized;
}
