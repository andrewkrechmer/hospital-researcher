// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  INDEPENDENT_GROUP_ID,
  buildHealthSystemRows,
  getSubRows,
} from "@/lib/table/health-system-rows";

import { buildTableFixture, makeHospital } from "./fixtures/table-data";

describe("buildHealthSystemRows", () => {
  it("creates one group row per health system, sorted by name", () => {
    const { healthSystems, hospitals } = buildTableFixture();
    const rows = buildHealthSystemRows(healthSystems, hospitals);

    expect(rows.map((row) => row.name)).toEqual([
      "Alpine Health Network",
      "Beacon Regional Health",
      "Cedar Hollow Health",
      "Unassigned",
    ]);
    expect(rows.every((row) => row.kind === "group")).toBe(true);
  });

  it("nests each system's hospitals under it, sorted by hospital name", () => {
    const { healthSystems, hospitals } = buildTableFixture();
    const rows = buildHealthSystemRows(healthSystems, hospitals);
    const alpine = rows[0];

    expect(alpine?.children.map((child) => child.hospital.name)).toEqual([
      "Alpine Summit Medical Center",
      "Alpine Valley Critical Access Hospital",
    ]);
    expect(alpine?.metrics.hospitalCount).toBe(2);
    expect(alpine?.metrics.totalBeds).toBe(444);
  });

  it("keeps a zero-hospital system as an empty group with zero metrics", () => {
    const { healthSystems, hospitals } = buildTableFixture();
    const cedar = buildHealthSystemRows(healthSystems, hospitals).find(
      (row) => row.name === "Cedar Hollow Health",
    );

    expect(cedar?.children).toEqual([]);
    expect(cedar?.metrics.hospitalCount).toBe(0);
    expect(cedar?.metrics.totalBeds).toBe(0);
    expect(cedar?.metrics.averageBeds).toBeNull();
  });

  it("collects hospitals with no canonical system into a labeled group placed last", () => {
    const { healthSystems, hospitals } = buildTableFixture();
    const rows = buildHealthSystemRows(healthSystems, hospitals);
    const last = rows[rows.length - 1];

    expect(last?.id).toBe(INDEPENDENT_GROUP_ID);
    expect(last?.groupKind).toBe("independent");
    expect(last?.sizeTier).toBeNull();
    expect(last?.primaryDomain).toBeNull();
    expect(last?.children.map((child) => child.hospital.name)).toEqual([
      "Riverside Community Hospital",
    ]);
    expect(last?.metrics.hospitalCount).toBe(1);
  });

  it("omits the independent group when every hospital is assigned", () => {
    const { healthSystems, hospitals } = buildTableFixture();
    const assignedOnly = hospitals.filter(
      (hospital) => hospital.canonicalHealthSystemId !== null,
    );

    const rows = buildHealthSystemRows(healthSystems, assignedOnly);

    expect(rows.some((row) => row.id === INDEPENDENT_GROUP_ID)).toBe(false);
  });

  it("never drops a hospital whose canonical system is not in the dataset", () => {
    const orphan = makeHospital({
      id: "h-orphan",
      name: "Orphan Hospital",
      canonicalHealthSystemId: "hs-missing",
      canonicalHealthSystemName: "Missing Health",
    });

    const rows = buildHealthSystemRows([], [orphan]);
    const allHospitalIds = rows.flatMap((row) =>
      row.children.map((child) => child.hospital.id),
    );

    expect(allHospitalIds).toEqual(["h-orphan"]);
  });

  it("places every hospital in exactly one group", () => {
    const { healthSystems, hospitals } = buildTableFixture();
    const rows = buildHealthSystemRows(healthSystems, hospitals);
    const ids = rows.flatMap((row) =>
      row.children.map((child) => child.hospital.id),
    );

    expect(ids).toHaveLength(hospitals.length);
    expect(new Set(ids).size).toBe(hospitals.length);
  });
});

describe("getSubRows", () => {
  it("returns children for group rows and undefined for hospital rows", () => {
    const { healthSystems, hospitals } = buildTableFixture();
    const rows = buildHealthSystemRows(healthSystems, hospitals);
    const group = rows[0];
    const child = group?.children[0];

    expect(getSubRows(group!)).toHaveLength(2);
    expect(getSubRows(child!)).toBeUndefined();
  });
});
