// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { getAllHospitals, getHospitalById, toHospitalRecord, type HospitalRow } from "@/lib/db/hospitals";
import { getAllHealthSystems } from "@/lib/db/health-systems";
import { readQuery } from "@/lib/db/client";
import { buildHealthSystemRows } from "@/lib/table/health-system-rows";
import { emptyFilterState } from "@/lib/filters/filter-types";
import { filterHospitals } from "@/lib/filters/filter-logic";

vi.mock("@/lib/db/client", () => ({ readQuery: vi.fn() }));
const query = vi.mocked(readQuery);
const source: HospitalRow = {
  id: "9007199254740993", hospital_name: "Real Hospital", cms_certification_number: "01A234",
  beds: 100, city: "Boston", state: "MA", zip: "02101", telephone: "555-0100",
  gross_revenue_raw: "$1,234", discharges: "100", patient_days: "500",
  health_system_domain_primary: "example.org", health_system_name: "Example Health",
  is_single_site: false, research_status: "Unresearched", source_url: null,
  research_note: "Original note", researched_at: null,
};
beforeEach(() => { query.mockReset(); });
it("preserves source identifiers and fields without invented claims or dates", () => {
  const result = toHospitalRecord(source);
  expect(result).toMatchObject({ id: "9007199254740993", cmsCcn: "01A234", zip: "02101", grossRevenueRaw: "$1,234", notes: "Original note", claims: [], updatedAt: "", canonicalConfidence: null });
  expect(JSON.parse(JSON.stringify(result)).id).toBe(source.id);
});
it("reads existing schema-qualified tables using a parameterized bigint identifier", async () => {
  query.mockResolvedValue([source]);
  expect((await getHospitalById(source.id))?.id).toBe(source.id);
  expect(query).toHaveBeenCalledWith(expect.stringContaining("FROM public.hospitals"), [source.id]);
  expect(query.mock.calls[0]?.[0]).toContain("WHERE h.id = $1::bigint");
});
it.each(["1; DROP TABLE hospitals", "not-an-id", "9223372036854775808", "-1"])("rejects invalid IDs without querying: %s", async (id) => {
  expect(await getHospitalById(id)).toBeNull();
  expect(query).not.toHaveBeenCalled();
});
it("returns not found for an absent hospital", async () => {
  query.mockResolvedValue([]);
  expect(await getHospitalById("123")).toBeNull();
});
it("derives system totals without writes and retains domain-based system identity", async () => {
  query.mockImplementation(async (sql) => sql.includes("SELECT domain, name")
    ? [{ domain: "example.org", name: "Example Health" }]
    : [source, { ...source, id: "2", beds: 50 }, { ...source, id: "3", beds: 900, health_system_domain_primary: null }]);
  const systems = await getAllHealthSystems();
  expect(systems[0]).toMatchObject({ id: "example.org", metrics: { hospitalCount: 2, totalBeds: 150, averageBeds: 75 } });
  expect(query.mock.calls.every(([sql]) => sql.startsWith("SELECT"))).toBe(true);
});
it("keeps single-site facilities and unassigned hospitals distinct and visible", async () => {
  query.mockResolvedValue([
    { ...source, id: "1", health_system_domain_primary: null, health_system_name: null, is_single_site: true },
    { ...source, id: "2", health_system_domain_primary: null, health_system_name: null, is_single_site: false },
  ]);
  const hospitals = await getAllHospitals();
  const groups = buildHealthSystemRows([], hospitals);
  expect(groups.map((group) => [group.name, group.children[0]?.id])).toEqual([["Single-site facilities", "1"], ["Unassigned", "2"]]);
  expect(filterHospitals(hospitals, [], { ...emptyFilterState(), missingHealthSystemOnly: true }).map((h) => h.id)).toEqual(["2"]);
});
