/**
 * Shared name/domain normalization used for hospital and health-system
 * matching, seeding, and manual entry.
 *
 * Matching deliberately prefers false negatives over incorrect merges: nothing
 * here expands abbreviations, so "St. Anne Health" and "Saint Anne Health" stay
 * separate records rather than being merged on a guess.
 */

/**
 * Lowercases, strips punctuation, and collapses whitespace so that cosmetic
 * differences ("Example Health, Inc." vs "example health inc") match.
 *
 * Periods and commas are removed entirely (not replaced with spaces) so that
 * acronym punctuation collapses: "H.C.A. Healthcare" matches "HCA Healthcare".
 * Other non-alphanumeric characters (underscores, hyphens) become word
 * separators. Apostrophes are dropped so possessives collapse
 * ("Children's" -> "childrens").
 */
export function normalizeName(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/['\u2018\u2019]/g, "")
      // Remove periods and commas without adding spaces so acronyms collapse
      // ("H.C.A." -> "hca") per VAL-IMPORT-039.
      .replace(/[.,]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
  );
}

/**
 * Reduces a domain or URL to a bare lowercase host: strips the scheme, `www.`,
 * any path, and trailing slashes. Returns `null` for blank/missing input.
 */
export function normalizeDomain(value: string | null | undefined): string | null {
  if (!value) return null;

  const withoutScheme = value.trim().toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  const host = (withoutScheme.split("/")[0] ?? "").replace(/^www\./, "");

  return host === "" ? null : host;
}
