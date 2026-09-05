import { readQuery } from "@/lib/db/client";
import { getAllHospitals } from "@/lib/db/hospitals";
import type { HealthSystemDetail, HealthSystemRecord, HospitalRecord } from "@/lib/types";
import { computeHealthSystemMetrics, groupHospitalsByHealthSystem } from "@/lib/utils/metrics";
import { computeSizeTier } from "@/lib/utils/size-tier";

function toSystem(row: { domain: string; name: string }, hospitals: HospitalRecord[]): HealthSystemRecord {
  const metrics = computeHealthSystemMetrics(hospitals);
  return {
    id: row.domain, name: row.name, primaryDomain: row.domain,
    websiteUrl: `https://${row.domain}`,
    headquartersCity: null, headquartersState: null,
    createdAt: "", updatedAt: "",
    sizeTier: computeSizeTier({ ...metrics, isMultiState: metrics.states.length > 1 }),
    metrics,
  };
}

export async function getAllHealthSystems(): Promise<HealthSystemRecord[]> {
  const [systems, hospitals] = await Promise.all([
    readQuery<{ domain: string; name: string }>("SELECT domain, name FROM public.health_systems ORDER BY name, domain"),
    getAllHospitals(),
  ]);
  const grouped = groupHospitalsByHealthSystem(hospitals);
  return systems.map((system) => toSystem(system, grouped.get(system.domain) ?? []));
}

export async function getHealthSystemById(id: string): Promise<HealthSystemDetail | null> {
  const systems = await readQuery<{ domain: string; name: string }>(
    "SELECT domain, name FROM public.health_systems WHERE domain = $1", [id],
  );
  if (!systems[0]) return null;
  const hospitals = (await getAllHospitals()).filter((h) => h.canonicalHealthSystemId === id);
  return { ...toSystem(systems[0], hospitals), hospitals };
}
