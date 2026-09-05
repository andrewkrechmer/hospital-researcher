// @vitest-environment node
import { describe, expect, it } from "vitest";

import { normalizeDomain, normalizeName } from "@/lib/utils/normalization";

describe("normalizeName", () => {
  it("lowercases, trims, and collapses whitespace", () => {
    expect(normalizeName("  Meridian   Health   Partners ")).toBe("meridian health partners");
  });

  it("strips punctuation", () => {
    expect(normalizeName("Example Health, Inc.")).toBe("example health inc");
  });

  it("collapses possessives instead of splitting them", () => {
    expect(normalizeName("Summit Children's Hospital")).toBe("summit childrens hospital");
  });

  it("keeps abbreviated and spelled-out names distinct", () => {
    expect(normalizeName("St. Anne Health")).not.toBe(normalizeName("Saint Anne Health"));
  });

  it("collapses acronym punctuation so H.C.A. matches HCA", () => {
    expect(normalizeName("H.C.A. Healthcare")).toBe(normalizeName("HCA Healthcare"));
  });
});

describe("normalizeDomain", () => {
  it("strips scheme, www., and path", () => {
    expect(normalizeDomain("https://www.Example-Health.org/locations/")).toBe(
      "example-health.org",
    );
  });

  it("passes through a bare host", () => {
    expect(normalizeDomain("examplehealth.org")).toBe("examplehealth.org");
  });

  it("returns null for missing or blank values", () => {
    expect(normalizeDomain(null)).toBeNull();
    expect(normalizeDomain(undefined)).toBeNull();
    expect(normalizeDomain("   ")).toBeNull();
  });
});
