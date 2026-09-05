/**
 * Conflict detection for health-system claims.
 *
 * A claim "conflicts" when it is a surviving (not marked incorrect) claim that
 * disagrees with the hospital's canonical assignment — either pointing at a
 * different matched health-system id, or (when ids are absent) using a
 * different normalized system name. Claims are never deleted here.
 */
import { normalizeName } from "@/lib/utils/normalization";

/** Minimal claim shape needed for conflict counting. */
export interface ClaimEvidence {
  matchedHealthSystemId: string | null;
  claimedHealthSystemName: string;
  isCanonical: boolean;
  markedIncorrect: boolean;
}

/** Canonical assignment context for a hospital. */
export interface CanonicalContext {
  healthSystemId: string | null;
  healthSystemName: string | null;
}

/**
 * Count surviving non-canonical claims that disagree with the canonical
 * assignment. Returns 0 when there are no claims or no disagreement.
 *
 * For an unassigned hospital (no canonical system), the conflict count is the
 * number of surviving claims that disagree with the most common system among
 * them — so three claims to three different systems yield 2 conflicts, while
 * three claims to the same system yield 0.
 */
export function countConflictingClaims(
  claims: ClaimEvidence[],
  canonical: CanonicalContext,
): number {
  const surviving = claims.filter((c) => !c.markedIncorrect);

  if (canonical.healthSystemId != null) {
    const canonicalName = canonical.healthSystemName
      ? normalizeName(canonical.healthSystemName)
      : null;

    let count = 0;
    for (const claim of surviving) {
      if (claim.isCanonical) continue;
      const claimSystemId = claim.matchedHealthSystemId;
      const claimName = normalizeName(claim.claimedHealthSystemName);
      if (claimSystemId != null && claimSystemId !== canonical.healthSystemId) {
        count += 1;
      } else if (
        claimSystemId == null &&
        canonicalName != null &&
        claimName !== canonicalName
      ) {
        count += 1;
      } else if (claimSystemId == null && canonicalName == null) {
        count += 1;
      }
    }
    return count;
  }

  // Unassigned hospital: conflict = surviving claims disagreeing with the
  // most common system. Group surviving claims by their system key.
  if (surviving.length <= 1) return 0;

  const groups = new Map<string, number>();
  for (const claim of surviving) {
    const key = claim.matchedHealthSystemId ?? normalizeName(claim.claimedHealthSystemName);
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  const maxGroup = Math.max(...groups.values());
  return surviving.length - maxGroup;
}
