/**
 * Tree-building logic for the Health System View.
 *
 * Converts the flat `HospitalRecord[]` + `HealthSystemRecord[]` lists into a
 * sorted array of group rows, each carrying its child hospital rows. This is
 * the data structure TanStack Table's `getSubRows` / expansion features consume.
 */
import type {
  HealthSystemMetrics,
  HealthSystemRecord,
  HospitalRecord,
} from "@/lib/types";
import {
  computeHealthSystemMetrics,
  groupHospitalsByHealthSystem,
  selectIndependentHospitals,
} from "@/lib/utils/metrics";

/** Stable id for the synthetic group that holds unassigned hospitals. */
export const INDEPENDENT_GROUP_ID = "__independent__";

/** A child (hospital) row in the Health System View tree. */
export interface HospitalChildRow {
  kind: "hospital";
  id: string;
  hospital: HospitalRecord;
}

/** A parent (group) row in the Health System View tree. */
export interface HealthSystemGroupRow {
  kind: "group";
  id: string;
  name: string;
  primaryDomain: string | null;
  sizeTier: string | null;
  metrics: HealthSystemMetrics;
  updatedAt: string;
  /** `"independent"` for the synthetic unassigned group, `null` otherwise. */
  groupKind: "independent" | null;
  children: HospitalChildRow[];
}

export type HealthSystemRow = HealthSystemGroupRow | HospitalChildRow;

function childRow(hospital: HospitalRecord): HospitalChildRow {
  return { kind: "hospital", id: hospital.id, hospital };
}

/**
 * Build the full Health System View tree from the flat data.
 *
 * - Health systems are sorted by name.
 * - Each system's hospitals are sorted by name.
 * - Hospitals whose canonical system is missing from the dataset are still
 *   included under a synthetic group keyed by that system's name.
 * - Independent hospitals (no canonical system) are collected into a labeled
 *   group placed last.
 */
export function buildHealthSystemRows(
  healthSystems: HealthSystemRecord[],
  hospitals: HospitalRecord[],
): HealthSystemGroupRow[] {
  const grouped = groupHospitalsByHealthSystem(hospitals);
  const rows: HealthSystemGroupRow[] = [];

  // Systems from the dataset, sorted by name.
  const sortedSystems = [...healthSystems].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  for (const system of sortedSystems) {
    const systemHospitals = grouped.get(system.id) ?? [];
    const children = systemHospitals
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(childRow);

    // Compute metrics from the given hospitals so that filtered subsets
    // show recomputed aggregate values (VAL-FILTER-058). When no filters are
    // active the given hospitals are the full set, so metrics match the
    // system's stored values.
    const metrics = computeHealthSystemMetrics(systemHospitals);
    const lastUpdate = metrics.lastHospitalUpdate ?? system.updatedAt;

    rows.push({
      kind: "group",
      id: system.id,
      name: system.name,
      primaryDomain: system.primaryDomain,
      sizeTier: system.sizeTier,
      metrics,
      updatedAt: lastUpdate,
      groupKind: null,
      children,
    });
  }

  // Hospitals whose canonical system id is not in the dataset — keep them
  // visible under a synthetic group named after their system.
  const knownIds = new Set(healthSystems.map((s) => s.id));
  const orphanGroups = new Map<string, HospitalRecord[]>();
  for (const [systemId, systemHospitals] of grouped) {
    if (knownIds.has(systemId)) continue;
    for (const h of systemHospitals) {
      const name = h.canonicalHealthSystemName ?? "Unknown System";
      const list = orphanGroups.get(name);
      if (list) {
        list.push(h);
      } else {
        orphanGroups.set(name, [h]);
      }
    }
  }
  for (const [name, systemHospitals] of orphanGroups) {
    const children = systemHospitals
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(childRow);
    rows.push({
      kind: "group",
      id: `__orphan__${name}`,
      name,
      primaryDomain: null,
      sizeTier: null,
      metrics: computeHealthSystemMetrics(systemHospitals),
      updatedAt: systemHospitals
        .map((h) => h.updatedAt)
        .sort()
        .pop() ?? new Date(0).toISOString(),
      groupKind: null,
      children,
    });
  }

  // Keep single-site facilities distinct from unresolved assignments.
  const withoutSystem = selectIndependentHospitals(hospitals);
  const groups = [
    { id: "__single_site__", name: "Single-site facilities", hospitals: withoutSystem.filter((h) => h.isSingleSite) },
    { id: INDEPENDENT_GROUP_ID, name: "Unassigned", hospitals: withoutSystem.filter((h) => !h.isSingleSite) },
  ];
  for (const group of groups) {
    if (group.hospitals.length === 0) continue;
    rows.push({
      kind: "group", id: group.id, name: group.name,
      primaryDomain: null, sizeTier: null,
      metrics: computeHealthSystemMetrics(group.hospitals),
      updatedAt: "", groupKind: "independent",
      children: group.hospitals.slice().sort((a, b) => a.name.localeCompare(b.name)).map(childRow),
    });
  }

  return rows;
}

/** `getSubRows` for TanStack Table: returns children for group rows, undefined for hospital rows. */
export function getSubRows(row: HealthSystemRow): HospitalChildRow[] | undefined {
  return row.kind === "group" ? row.children : undefined;
}
