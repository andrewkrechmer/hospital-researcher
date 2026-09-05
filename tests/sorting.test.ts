import type { Row } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";

import {
  CONFIDENCE_RANK,
  SIZE_TIER_RANK,
  nullableDateSort,
  nullableNumericSort,
  nullableTextSort,
  rankSort,
} from "@/lib/table/sorting";

/** Minimal row shape that matches the SortingFn (rowA, rowB, columnId) API. */
function row(values: Record<string, unknown>): Row<Record<string, unknown>> {
  return {
    getValue: <T,>(id: string): T => values[id] as T,
  } as unknown as Row<Record<string, unknown>>;
}

describe("sorting utilities", () => {
  describe("nullableNumericSort", () => {
    it("orders numbers ascending", () => {
      expect(nullableNumericSort(row({ x: 20 }), row({ x: 1000 }), "x")).toBeLessThan(0);
    });

    it("does not sort formatted numbers lexicographically (20 before 1000)", () => {
      // 20 < 1000 numerically; a lexicographic sort would put "1,000" before "20"
      expect(nullableNumericSort(row({ x: 20 }), row({ x: 1000 }), "x")).toBe(-980);
    });

    it("treats null as smallest (first in ascending, last in descending)", () => {
      expect(nullableNumericSort(row({ x: null }), row({ x: 5 }), "x")).toBeLessThan(0);
      expect(nullableNumericSort(row({ x: 5 }), row({ x: null }), "x")).toBeGreaterThan(0);
    });

    it("treats two nulls as equal", () => {
      expect(nullableNumericSort(row({ x: null }), row({ x: null }), "x")).toBe(0);
    });
  });

  describe("nullableTextSort", () => {
    it("orders strings case-insensitively", () => {
      expect(nullableTextSort(row({ x: "apple" }), row({ x: "Banana" }), "x")).toBeLessThan(0);
    });

    it("places nulls last in ascending order", () => {
      expect(nullableTextSort(row({ x: null }), row({ x: "a" }), "x")).toBeGreaterThan(0);
    });
  });

  describe("nullableDateSort", () => {
    it("orders ISO dates chronologically", () => {
      expect(
        nullableDateSort(row({ x: "2026-01-01T00:00:00.000Z" }), row({ x: "2026-06-01T00:00:00.000Z" }), "x"),
      ).toBeLessThan(0);
    });

    it("treats null as earliest (first in ascending, last in descending)", () => {
      expect(nullableDateSort(row({ x: null }), row({ x: "2026-01-01T00:00:00.000Z" }), "x")).toBeLessThan(0);
    });
  });

  describe("rankSort and rank maps", () => {
    it("ranks size tiers Enterprise > Large > Mid-Market > Small", () => {
      expect(SIZE_TIER_RANK.Enterprise).toBeGreaterThan(SIZE_TIER_RANK.Large);
      expect(SIZE_TIER_RANK.Large).toBeGreaterThan(SIZE_TIER_RANK["Mid-Market"]);
      expect(SIZE_TIER_RANK["Mid-Market"]).toBeGreaterThan(SIZE_TIER_RANK.Small);
    });

    it("ranks confidence high > medium > low > unknown", () => {
      expect(CONFIDENCE_RANK.high).toBeGreaterThan(CONFIDENCE_RANK.medium);
      expect(CONFIDENCE_RANK.medium).toBeGreaterThan(CONFIDENCE_RANK.low);
      expect(CONFIDENCE_RANK.low).toBeGreaterThan(CONFIDENCE_RANK.unknown);
    });

    it("orders ranks numerically", () => {
      expect(rankSort(row({ x: 4 }), row({ x: 1 }), "x")).toBeGreaterThan(0);
      expect(rankSort(row({ x: null }), row({ x: 1 }), "x")).toBeGreaterThan(0);
    });
  });
});
