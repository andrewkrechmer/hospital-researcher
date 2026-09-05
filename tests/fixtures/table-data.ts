/**
 * Fixtures for table/metrics tests.
 *
 * These build the serialized shapes the client table consumes
 * (`HospitalRecord` / `HealthSystemRecord`), not Prisma rows, so table tests
 * never need the database.
 */
import type { HealthSystemRecord, HospitalRecord } from "@/lib/types";
import { computeHealthSystemMetrics } from "@/lib/utils/metrics";

let hospitalSeq = 0;

export function makeHospital(
  overrides: Partial<HospitalRecord> = {},
): HospitalRecord {
  hospitalSeq += 1;
  return {
    id: `hospital-${hospitalSeq}`,
    name: `Hospital ${hospitalSeq}`,
    cmsCcn: null,
    address: null,
    city: null,
    state: null,
    zip: null,
    hospitalDomain: null,
    facilityType: "Acute Care",
    bedCount: 100,
    canonicalHealthSystemId: null,
    canonicalHealthSystemName: null,
    canonicalHealthSystemDomain: null,
    canonicalRelationshipType: null,
    canonicalConfidence: "high",
    claimCount: 1,
    conflictingClaimCount: 0,
    hasConflictingClaims: false,
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeHealthSystem(
  overrides: Partial<HealthSystemRecord> = {},
): HealthSystemRecord {
  const base: HealthSystemRecord = {
    id: "system-1",
    name: "System One",
    primaryDomain: "systemone.org",
    websiteUrl: null,
    headquartersCity: null,
    headquartersState: null,
    sizeTier: "Large",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    metrics: computeHealthSystemMetrics([]),
    ...overrides,
  };
  return base;
}

export interface TableFixture {
  healthSystems: HealthSystemRecord[];
  hospitals: HospitalRecord[];
}

/**
 * Small dataset covering the edge cases the Health System View must handle:
 * a multi-state system, a system whose hospital has no bed count, a system with
 * zero canonical hospitals, and an independent hospital with conflicting claims.
 */
export function buildTableFixture(): TableFixture {
  const alpineHospitals = [
    makeHospital({
      id: "h-alpine-summit",
      name: "Alpine Summit Medical Center",
      city: "Reno",
      state: "NV",
      hospitalDomain: "alpinesummit.org",
      facilityType: "Acute Care",
      bedCount: 420,
      canonicalHealthSystemId: "hs-alpine",
      canonicalHealthSystemName: "Alpine Health Network",
      canonicalHealthSystemDomain: "alpinehealth.org",
      canonicalRelationshipType: "owned",
      canonicalConfidence: "high",
      updatedAt: "2026-06-02T00:00:00.000Z",
    }),
    makeHospital({
      id: "h-alpine-valley",
      name: "Alpine Valley Critical Access Hospital",
      city: "Truckee",
      state: "CA",
      hospitalDomain: null,
      facilityType: "Critical Access",
      bedCount: 24,
      canonicalHealthSystemId: "hs-alpine",
      canonicalHealthSystemName: "Alpine Health Network",
      canonicalHealthSystemDomain: "alpinehealth.org",
      canonicalRelationshipType: "member",
      canonicalConfidence: "medium",
      claimCount: 3,
      conflictingClaimCount: 1,
      hasConflictingClaims: true,
      updatedAt: "2026-06-10T00:00:00.000Z",
    }),
  ];

  const beaconHospitals = [
    makeHospital({
      id: "h-beacon-central",
      name: "Beacon Central Hospital",
      city: "Akron",
      state: "OH",
      facilityType: null,
      bedCount: null,
      canonicalHealthSystemId: "hs-beacon",
      canonicalHealthSystemName: "Beacon Regional Health",
      canonicalHealthSystemDomain: null,
      canonicalRelationshipType: "affiliate",
      canonicalConfidence: "low",
      updatedAt: "2026-04-20T00:00:00.000Z",
    }),
  ];

  const independentHospital = makeHospital({
    id: "h-riverside",
    name: "Riverside Community Hospital",
    city: "Fresno",
    state: "CA",
    facilityType: "Psychiatric",
    bedCount: 88,
    canonicalConfidence: null,
    claimCount: 3,
    conflictingClaimCount: 2,
    hasConflictingClaims: true,
    updatedAt: "2026-03-05T00:00:00.000Z",
  });

  const healthSystems = [
    makeHealthSystem({
      id: "hs-alpine",
      name: "Alpine Health Network",
      primaryDomain: "alpinehealth.org",
      sizeTier: "Large",
      metrics: computeHealthSystemMetrics(alpineHospitals),
    }),
    makeHealthSystem({
      id: "hs-beacon",
      name: "Beacon Regional Health",
      primaryDomain: null,
      sizeTier: "Small",
      metrics: computeHealthSystemMetrics(beaconHospitals),
    }),
    makeHealthSystem({
      id: "hs-cedar",
      name: "Cedar Hollow Health",
      primaryDomain: "cedarhollow.org",
      sizeTier: null,
      metrics: computeHealthSystemMetrics([]),
    }),
  ];

  return {
    healthSystems,
    hospitals: [...alpineHospitals, ...beaconHospitals, independentHospital],
  };
}

/** Large dataset used to assert that row rendering stays virtualized. */
export function buildLargeTableFixture(systemCount = 200): TableFixture {
  const healthSystems: HealthSystemRecord[] = [];
  const hospitals: HospitalRecord[] = [];

  for (let index = 0; index < systemCount; index += 1) {
    const id = `hs-bulk-${String(index).padStart(4, "0")}`;
    const systemHospitals = [0, 1, 2].map((offset) =>
      makeHospital({
        id: `${id}-h-${offset}`,
        name: `Bulk Hospital ${index}-${offset}`,
        state: offset === 0 ? "TX" : "OK",
        bedCount: 50 + offset * 10,
        canonicalHealthSystemId: id,
        canonicalHealthSystemName: `Bulk Health System ${index}`,
      }),
    );

    hospitals.push(...systemHospitals);
    healthSystems.push(
      makeHealthSystem({
        id,
        name: `Bulk Health System ${index}`,
        metrics: computeHealthSystemMetrics(systemHospitals),
      }),
    );
  }

  return { healthSystems, hospitals };
}
