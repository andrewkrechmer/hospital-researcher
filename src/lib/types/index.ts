/**
 * Shared, serialization-safe shapes exchanged between the data access layer,
 * the API routes, and the client table.
 *
 * Every date is an ISO-8601 string (not a `Date`) so the records can cross the
 * server/client boundary as JSON without conversion.
 */

/** Normalized data-quality level for a canonical assignment. */
export type ConfidenceLevel = "high" | "medium" | "low" | "unknown";

/**
 * A single health-system claim — immutable evidence of a hospital's
 * relationship to a health system. Source fields are set at creation and never
 * changed; only `isCanonical`, `notes`, and `markedIncorrect` are editable.
 */
export interface ClaimRecord {
  id: string;
  hospitalId: string;
  claimedHealthSystemName: string;
  matchedHealthSystemId: string | null;
  claimedDomain: string | null;
  relationshipType: string | null;
  sourceType: string;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceRecordId: string | null;
  researchMethod: string | null;
  confidence: string | null;
  effectiveDate: string | null;
  retrievedAt: string | null;
  notes: string | null;
  isCanonical: boolean;
  markedIncorrect: boolean;
  createdAt: string;
}

/** One hospital plus the denormalized fields the table needs to render it. */
export interface HospitalRecord {
  /** Fields from the existing Postgres table; optional for legacy UI fixtures. */
  isSingleSite?: boolean | null;
  telephone?: string | null;
  grossRevenueRaw?: string | null;
  discharges?: string | null;
  patientDays?: string | null;
  researchStatus?: string | null;
  sourceUrl?: string | null;
  researchedAt?: string | null;
  id: string;
  name: string;
  cmsCcn: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  hospitalDomain: string | null;
  facilityType: string | null;
  bedCount: number | null;
  /** Null means no assigned system; it does not prove independent ownership. */
  canonicalHealthSystemId: string | null;
  canonicalHealthSystemName: string | null;
  canonicalHealthSystemDomain: string | null;
  canonicalRelationshipType: string | null;
  canonicalConfidence: string | null;
  /** Total claims on record, including non-canonical and incorrect ones. */
  claimCount: number;
  /** Surviving claims that disagree with the canonical assignment. */
  conflictingClaimCount: number;
  hasConflictingClaims: boolean;
  updatedAt: string;
}

/** Aggregates derived from a health system's canonically assigned hospitals. */
export interface HealthSystemMetrics {
  hospitalCount: number;
  totalBeds: number;
  /** `totalBeds / hospitalCount`; `null` when the system has no hospitals. */
  averageBeds: number | null;
  /** Median over hospitals that report a bed count; `null` when none do. */
  medianBeds: number | null;
  /** How many hospitals reported a bed count (the rest count as 0 beds). */
  hospitalsWithBedCount: number;
  largestHospitalName: string | null;
  largestHospitalBeds: number | null;
  /** Unique state codes, sorted ascending. */
  states: string[];
  facilityTypeBreakdown: FacilityTypeCount[];
  /** Dominant confidence level across canonical assignments. */
  confidence: ConfidenceLevel;
  confidenceCounts: Record<ConfidenceLevel, number>;
  /** Hospitals in this system that have conflicting claims. */
  conflictCount: number;
  /** Most recent hospital `updatedAt` in the system; `null` when empty. */
  lastHospitalUpdate: string | null;
}

export interface FacilityTypeCount {
  facilityType: string;
  count: number;
}

/** One health system with its derived metrics. */
export interface HealthSystemRecord {
  id: string;
  name: string;
  primaryDomain: string | null;
  websiteUrl: string | null;
  headquartersCity: string | null;
  headquartersState: string | null;
  /** Stored classification; `null` until size tiers are computed. */
  sizeTier: string | null;
  createdAt: string;
  updatedAt: string;
  metrics: HealthSystemMetrics;
}

/** Health system detail with its derived metrics and canonical hospitals. */
export interface HealthSystemDetail extends HealthSystemRecord {
  /** Hospitals canonically assigned to this system. */
  hospitals: HospitalRecord[];
}

/** Hospital detail with its full claims history (for the detail drawer). */
export interface HospitalDetail extends HospitalRecord {
  /** All claims on record for this hospital, oldest first. */
  claims: ClaimRecord[];
  /** Free-text notes on the hospital record. */
  notes: string | null;
}

/** Payload of `GET /api/hospitals/:id`. */
export interface HospitalDetailResponse {
  hospital: HospitalDetail;
}

/** Payload of `GET /api/hospitals`. */
export interface HospitalsResponse {
  hospitals: HospitalRecord[];
  count: number;
}

/** Payload of `GET /api/health-systems`. */
export interface HealthSystemsResponse {
  healthSystems: HealthSystemRecord[];
  count: number;
}

/** Error payload returned by the table's API routes. */
export interface ApiErrorResponse {
  error: string;
}
