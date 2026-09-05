/**
 * Fixtures for the hospital and health-system detail drawer tests.
 *
 * These build the serialized shapes the drawers consume
 * (`HospitalDetail` with `ClaimRecord[]`, `HealthSystemDetail`), not Prisma
 * rows, so drawer tests never need the database.
 */
import type {
  ClaimRecord,
  HealthSystemDetail,
  HospitalDetail,
  HospitalRecord,
} from "@/lib/types";
import { computeHealthSystemMetrics } from "@/lib/utils/metrics";

let claimSeq = 0;

export function makeClaim(
  overrides: Partial<ClaimRecord> = {},
): ClaimRecord {
  claimSeq += 1;
  return {
    id: `claim-${claimSeq}`,
    hospitalId: "h-test",
    claimedHealthSystemName: `System ${claimSeq}`,
    matchedHealthSystemId: `hs-${claimSeq}`,
    claimedDomain: `system${claimSeq}.org`,
    relationshipType: "owned",
    sourceType: "imported_dataset",
    sourceName: "Synthetic commercial-dataset fixture",
    sourceUrl: `https://system${claimSeq}.org/about`,
    sourceRecordId: `REC-${claimSeq}`,
    researchMethod: null,
    confidence: "high",
    effectiveDate: "2024-01-15T00:00:00.000Z",
    retrievedAt: null,
    notes: null,
    isCanonical: false,
    markedIncorrect: false,
    createdAt: `2025-0${(claimSeq % 9) + 1}-01T00:00:00.000Z`,
    ...overrides,
  };
}

export function makeHospitalDetail(
  overrides: Partial<HospitalDetail> = {},
): HospitalDetail {
  return {
    id: "h-test",
    name: "Test Hospital",
    cmsCcn: "500001",
    address: "1 Test Road",
    city: "Springfield",
    state: "MA",
    zip: "01103",
    hospitalDomain: "testhospital.org",
    facilityType: "Acute Care",
    bedCount: 250,
    canonicalHealthSystemId: "hs-1",
    canonicalHealthSystemName: "Test Health System",
    canonicalHealthSystemDomain: "testhealth.org",
    canonicalRelationshipType: "owned",
    canonicalConfidence: "high",
    claimCount: 1,
    conflictingClaimCount: 0,
    hasConflictingClaims: false,
    updatedAt: "2026-05-01T00:00:00.000Z",
    notes: null,
    claims: [],
    ...overrides,
  };
}

/** A hospital with four claims to three systems (conflict resolved). */
export function conflictingHospitalDetail(): HospitalDetail {
  const claims: ClaimRecord[] = [
    makeClaim({
      id: "claim-canon",
      hospitalId: "h-beacon",
      claimedHealthSystemName: "Meridian Health Partners",
      matchedHealthSystemId: "hs-meridian",
      claimedDomain: "meridianhealthpartners.org",
      relationshipType: "owned",
      sourceType: "imported_dataset",
      sourceName: "Synthetic commercial-dataset fixture",
      sourceUrl: "https://meridianhealthpartners.org/locations/beacon-hill",
      sourceRecordId: "MERIDIAN-9001",
      confidence: "high",
      effectiveDate: "2024-06-01T00:00:00.000Z",
      isCanonical: true,
      createdAt: "2025-01-01T00:00:00.000Z",
    }),
    makeClaim({
      id: "claim-alt-1",
      hospitalId: "h-beacon",
      claimedHealthSystemName: "Northwind Health Network",
      matchedHealthSystemId: "hs-northwind",
      claimedDomain: "northwindhealth.org",
      relationshipType: "affiliate",
      sourceType: "LLM_research",
      sourceName: "Synthetic LLM-research fixture",
      sourceUrl: "https://northwindhealth.org/about/partners",
      researchMethod: "OpenAI + web search",
      confidence: "medium",
      notes: "Model cited a 2019 press release that may be stale.",
      isCanonical: false,
      createdAt: "2025-02-01T00:00:00.000Z",
    }),
    makeClaim({
      id: "claim-alt-2",
      hospitalId: "h-beacon",
      claimedHealthSystemName: "Silver Lake Health",
      matchedHealthSystemId: "hs-silverlake",
      claimedDomain: "silverlakehealth.org",
      relationshipType: "managed",
      sourceType: "manual",
      sourceName: "Synthetic analyst-review fixture",
      sourceUrl: null,
      sourceRecordId: null,
      researchMethod: null,
      confidence: "low",
      notes: "Analyst recalled a management agreement; needs verification.",
      isCanonical: false,
      createdAt: "2025-03-01T00:00:00.000Z",
    }),
    makeClaim({
      id: "claim-alt-3",
      hospitalId: "h-beacon",
      claimedHealthSystemName: "Beacon Health Collaborative",
      matchedHealthSystemId: null,
      claimedDomain: "beaconhealthcollaborative.org",
      relationshipType: "member",
      sourceType: "Tavily_research",
      sourceName: "Synthetic web-search fixture",
      sourceUrl: null,
      researchMethod: "Tavily + OpenAI",
      confidence: "low",
      isCanonical: false,
      createdAt: "2025-04-01T00:00:00.000Z",
    }),
  ];

  return makeHospitalDetail({
    id: "h-beacon",
    name: "Beacon Hill Hospital",
    canonicalHealthSystemId: "hs-meridian",
    canonicalHealthSystemName: "Meridian Health Partners",
    canonicalHealthSystemDomain: "meridianhealthpartners.org",
    canonicalRelationshipType: "owned",
    canonicalConfidence: "high",
    claimCount: 4,
    conflictingClaimCount: 3,
    hasConflictingClaims: true,
    claims,
  });
}

/** A hospital with exactly one (canonical) claim. */
export function singleClaimHospitalDetail(): HospitalDetail {
  return makeHospitalDetail({
    id: "h-single",
    name: "Mercy General Hospital",
    claimCount: 1,
    claims: [
      makeClaim({
        id: "claim-single",
        hospitalId: "h-single",
        claimedHealthSystemName: "Meridian Health Partners",
        matchedHealthSystemId: "hs-meridian",
        claimedDomain: "meridianhealthpartners.org",
        confidence: "high",
        isCanonical: true,
      }),
    ],
  });
}

/** A hospital with zero claims. */
export function zeroClaimHospitalDetail(): HospitalDetail {
  return makeHospitalDetail({
    id: "h-zero",
    name: "Riverside Community Hospital",
    canonicalHealthSystemId: null,
    canonicalHealthSystemName: null,
    canonicalHealthSystemDomain: null,
    canonicalRelationshipType: null,
    canonicalConfidence: null,
    claimCount: 0,
    claims: [],
  });
}

/** A hospital with many missing values (sparse record). */
export function sparseHospitalDetail(): HospitalDetail {
  return makeHospitalDetail({
    id: "h-sparse",
    name: "Cottonwood Rural Health Center",
    cmsCcn: null,
    address: null,
    city: "Cottonwood Falls",
    state: "KS",
    zip: null,
    hospitalDomain: null,
    facilityType: null,
    bedCount: null,
    canonicalHealthSystemId: null,
    canonicalHealthSystemName: null,
    canonicalHealthSystemDomain: null,
    canonicalRelationshipType: null,
    canonicalConfidence: null,
    claimCount: 0,
    claims: [],
  });
}

// ─── Health System Detail fixtures ───

let hsHospitalSeq = 0;

function makeSystemHospital(
  overrides: Partial<HospitalRecord> = {},
): HospitalRecord {
  hsHospitalSeq += 1;
  return {
    id: `hs-h-${hsHospitalSeq}`,
    name: `System Hospital ${hsHospitalSeq}`,
    cmsCcn: null,
    address: null,
    city: null,
    state: null,
    zip: null,
    hospitalDomain: null,
    facilityType: "Acute Care",
    bedCount: 100,
    canonicalHealthSystemId: "hs-test",
    canonicalHealthSystemName: "Test Health System",
    canonicalHealthSystemDomain: "testhealth.org",
    canonicalRelationshipType: "owned",
    canonicalConfidence: "high",
    claimCount: 1,
    conflictingClaimCount: 0,
    hasConflictingClaims: false,
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

/** A multi-hospital system with varied facility types, states, and beds. */
export function multiHospitalSystemDetail(): HealthSystemDetail {
  const hospitals: HospitalRecord[] = [
    makeSystemHospital({
      id: "hs-alpine-1",
      name: "Alpine Summit Medical Center",
      city: "Reno",
      state: "NV",
      hospitalDomain: "alpinesummit.org",
      facilityType: "Acute Care",
      bedCount: 420,
      canonicalHealthSystemId: "hs-alpine",
      canonicalHealthSystemName: "Alpine Health Network",
      canonicalHealthSystemDomain: "alpinehealth.org",
    }),
    makeSystemHospital({
      id: "hs-alpine-2",
      name: "Alpine Valley Critical Access Hospital",
      city: "Truckee",
      state: "CA",
      facilityType: "Critical Access",
      bedCount: 24,
      canonicalHealthSystemId: "hs-alpine",
      canonicalHealthSystemName: "Alpine Health Network",
      canonicalHealthSystemDomain: "alpinehealth.org",
    }),
    makeSystemHospital({
      id: "hs-alpine-3",
      name: "Alpine Children's Center",
      city: "Reno",
      state: "NV",
      facilityType: "Children's",
      bedCount: 150,
      canonicalHealthSystemId: "hs-alpine",
      canonicalHealthSystemName: "Alpine Health Network",
      canonicalHealthSystemDomain: "alpinehealth.org",
    }),
    makeSystemHospital({
      id: "hs-alpine-4",
      name: "Alpine Rehab Facility",
      city: "Carson City",
      state: "NV",
      facilityType: "Rehabilitation",
      bedCount: null,
      canonicalHealthSystemId: "hs-alpine",
      canonicalHealthSystemName: "Alpine Health Network",
      canonicalHealthSystemDomain: "alpinehealth.org",
    }),
  ];

  return {
    id: "hs-alpine",
    name: "Alpine Health Network",
    primaryDomain: "alpinehealth.org",
    websiteUrl: "https://alpinehealth.org",
    headquartersCity: "Reno",
    headquartersState: "NV",
    sizeTier: "Large",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z",
    metrics: computeHealthSystemMetrics(hospitals),
    hospitals,
  };
}

/** A health system with zero hospitals (empty system). */
export function emptySystemDetail(): HealthSystemDetail {
  return {
    id: "hs-cedar",
    name: "Cedar Hollow Health",
    primaryDomain: "cedarhollow.org",
    websiteUrl: null,
    headquartersCity: null,
    headquartersState: null,
    sizeTier: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    metrics: computeHealthSystemMetrics([]),
    hospitals: [],
  };
}

/** A health system with a single hospital. */
export function singleHospitalSystemDetail(): HealthSystemDetail {
  const hospitals: HospitalRecord[] = [
    makeSystemHospital({
      id: "hs-beacon-1",
      name: "Beacon Central Hospital",
      city: "Akron",
      state: "OH",
      facilityType: "Acute Care",
      bedCount: 320,
      canonicalHealthSystemId: "hs-beacon",
      canonicalHealthSystemName: "Beacon Regional Health",
      canonicalHealthSystemDomain: null,
    }),
  ];

  return {
    id: "hs-beacon",
    name: "Beacon Regional Health",
    primaryDomain: null,
    websiteUrl: null,
    headquartersCity: null,
    headquartersState: null,
    sizeTier: "Small",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-04-20T00:00:00.000Z",
    metrics: computeHealthSystemMetrics(hospitals),
    hospitals,
  };
}
