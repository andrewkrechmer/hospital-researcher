import { readQuery } from "@/lib/db/client";
import type { HospitalDetail, HospitalRecord } from "@/lib/types";

export interface HospitalRow {
  id: string;
  hospital_name: string;
  cms_certification_number: string | null;
  beds: number | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  telephone: string | null;
  gross_revenue_raw: string | null;
  discharges: string | null;
  patient_days: string | null;
  health_system_domain_primary: string | null;
  health_system_name: string | null;
  is_single_site: boolean | null;
  research_status: string | null;
  source_url: string | null;
  research_note: string | null;
  researched_at: Date | null;
}

const SELECT_HOSPITALS = `SELECT h.id::text, h.hospital_name,
  h.cms_certification_number, h.beds, h.city, h.state, h.zip,
  h.telephone, h.gross_revenue_raw, h.discharges, h.patient_days,
  h.health_system_domain_primary, s.name AS health_system_name,
  h.is_single_site, h.research_status, h.source_url, h.research_note, h.researched_at
  FROM public.hospitals h
  LEFT JOIN public.health_systems s ON s.domain = h.health_system_domain_primary`;

/** Keep original IDs and source values. Unsupported legacy UI fields stay empty.
 * No claims, confidence scores, affiliations or update timestamps are invented.
 */
export function toHospitalRecord(row: HospitalRow): HospitalDetail {
  return {
    id: row.id, name: row.hospital_name, cmsCcn: row.cms_certification_number,
    bedCount: row.beds, city: row.city, state: row.state, zip: row.zip,
    canonicalHealthSystemId: row.health_system_domain_primary,
    canonicalHealthSystemDomain: row.health_system_domain_primary,
    canonicalHealthSystemName: row.health_system_name,
    isSingleSite: row.is_single_site,
    telephone: row.telephone, grossRevenueRaw: row.gross_revenue_raw,
    discharges: row.discharges, patientDays: row.patient_days,
    researchStatus: row.research_status, sourceUrl: row.source_url,
    researchedAt: row.researched_at?.toISOString() ?? null,
    notes: row.research_note,
    address: null, hospitalDomain: null, facilityType: null,
    canonicalRelationshipType: null, canonicalConfidence: null,
    claimCount: 0, conflictingClaimCount: 0, hasConflictingClaims: false,
    updatedAt: "", claims: [],
  };
}

export async function getAllHospitals(): Promise<HospitalRecord[]> {
  const rows = await readQuery<HospitalRow>(`${SELECT_HOSPITALS} ORDER BY h.hospital_name, h.id`);
  return rows.map(toHospitalRecord);
}

export async function getHospitalById(id: string): Promise<HospitalDetail | null> {
  // Never convert bigint IDs through JavaScript Number.
  if (!/^[0-9]+$/.test(id) || id.length > 19 || BigInt(id) > 9223372036854775807n) return null;
  const rows = await readQuery<HospitalRow>(`${SELECT_HOSPITALS} WHERE h.id = $1::bigint`, [id]);
  return rows[0] ? toHospitalRecord(rows[0]) : null;
}
