/**
 * Derived health-system metrics computed from canonical hospital assignments.
 *
 * Per architecture.md these are computed at query time, never stored as stale
 * columns, so they always reflect the current canonical assignments.
 */
import type {
  ConfidenceLevel,
  FacilityTypeCount,
  HealthSystemMetrics,
  HospitalRecord,
} from "@/lib/types";

/** Map a raw confidence string to one of the four normalized levels. */
export function normalizeConfidenceLevel(value: string | null | undefined): ConfidenceLevel {
  if (value == null) return "unknown";
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "high") return "high";
  if (trimmed === "medium") return "medium";
  if (trimmed === "low") return "low";
  return "unknown";
}

const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
  unknown: 0,
};

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

/**
 * Compute every aggregate metric for a health system from its canonical
 * hospitals. Safe for an empty array (zero-hospital system).
 */
export function computeHealthSystemMetrics(
  hospitals: HospitalRecord[],
): HealthSystemMetrics {
  const hospitalCount = hospitals.length;

  const hospitalsWithBeds = hospitals.filter((h) => h.bedCount != null);
  const totalBeds = hospitals.reduce(
    (sum, h) => sum + (h.bedCount ?? 0),
    0,
  );

  const bedCounts = hospitalsWithBeds
    .map((h) => h.bedCount!)
    .sort((a, b) => a - b);

  // Average is total beds divided by the count of hospitals that report a
  // non-null bed count (NOT total hospital count), per VAL-EDIT-021.
  const averageBeds = hospitalsWithBeds.length > 0 ? Math.round(totalBeds / hospitalsWithBeds.length) : null;
  const medianBeds = bedCounts.length > 0 ? median(bedCounts) : null;

  // Largest hospital by bed count, tie-broken alphabetically by name so the
  // result is deterministic across runs.
  let largestHospitalName: string | null = null;
  let largestHospitalBeds: number | null = null;
  for (const h of hospitals) {
    if (h.bedCount == null) continue;
    if (
      largestHospitalBeds == null ||
      h.bedCount > largestHospitalBeds ||
      (h.bedCount === largestHospitalBeds &&
        (largestHospitalName == null || h.name < largestHospitalName))
    ) {
      largestHospitalName = h.name;
      largestHospitalBeds = h.bedCount;
    }
  }

  const states = Array.from(
    new Set(hospitals.map((h) => h.state).filter((s): s is string => s != null)),
  ).sort();

  // Group facility types, mapping null to "Unknown" so null types are
  // consistently represented rather than silently dropped (VAL-EDIT-075).
  const typeMap = new Map<string, number>();
  for (const h of hospitals) {
    const type = h.facilityType ?? "Unknown";
    typeMap.set(type, (typeMap.get(type) ?? 0) + 1);
  }
  const facilityTypeBreakdown: FacilityTypeCount[] = Array.from(
    typeMap.entries(),
  )
    .map(([facilityType, count]) => ({ facilityType, count }))
    .sort((a, b) => b.count - a.count || a.facilityType.localeCompare(b.facilityType));

  const confidenceCounts: Record<ConfidenceLevel, number> = {
    high: 0,
    medium: 0,
    low: 0,
    unknown: 0,
  };
  for (const h of hospitals) {
    confidenceCounts[normalizeConfidenceLevel(h.canonicalConfidence)] += 1;
  }

  // Dominant confidence = highest count. Ties break downward (lower confidence
  // wins) so a split between high and low reports "low" rather than "high".
  let confidence: ConfidenceLevel = "unknown";
  let bestCount = -1;
  (["high", "medium", "low", "unknown"] as const).forEach((level) => {
    const count = confidenceCounts[level];
    if (count > bestCount || (count === bestCount && CONFIDENCE_RANK[level] < CONFIDENCE_RANK[confidence])) {
      confidence = level;
      bestCount = count;
    }
  });
  if (hospitalCount === 0) confidence = "unknown";

  const conflictCount = hospitals.filter((h) => h.hasConflictingClaims).length;

  const timestamps = hospitals.map((h) => h.updatedAt).filter(Boolean).sort();
  const lastHospitalUpdate = timestamps.length > 0 ? timestamps[timestamps.length - 1]! : null;

  return {
    hospitalCount,
    totalBeds,
    averageBeds,
    medianBeds,
    hospitalsWithBedCount: hospitalsWithBeds.length,
    largestHospitalName,
    largestHospitalBeds,
    states,
    facilityTypeBreakdown,
    confidence,
    confidenceCounts,
    conflictCount,
    lastHospitalUpdate,
  };
}

/** Group hospitals by their `canonicalHealthSystemId` (skips independents). */
export function groupHospitalsByHealthSystem(
  hospitals: HospitalRecord[],
): Map<string, HospitalRecord[]> {
  const map = new Map<string, HospitalRecord[]>();
  for (const h of hospitals) {
    if (h.canonicalHealthSystemId == null) continue;
    const list = map.get(h.canonicalHealthSystemId);
    if (list) {
      list.push(h);
    } else {
      map.set(h.canonicalHealthSystemId, [h]);
    }
  }
  return map;
}

/** Select hospitals with no canonical health system (independents). */
export function selectIndependentHospitals(
  hospitals: HospitalRecord[],
): HospitalRecord[] {
  return hospitals.filter((h) => h.canonicalHealthSystemId == null);
}
