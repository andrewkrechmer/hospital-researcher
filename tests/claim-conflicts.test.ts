// @vitest-environment node
import { describe, expect, it } from "vitest";

import { countConflictingClaims } from "@/lib/utils/claim-conflicts";
import type { ClaimEvidence } from "@/lib/utils/claim-conflicts";

function claim(overrides: Partial<ClaimEvidence> = {}): ClaimEvidence {
  return {
    matchedHealthSystemId: null,
    claimedHealthSystemName: "Some Health System",
    isCanonical: false,
    markedIncorrect: false,
    ...overrides,
  };
}

describe("countConflictingClaims", () => {
  it("counts non-canonical claims pointing at a different system", () => {
    const count = countConflictingClaims(
      [
        claim({ matchedHealthSystemId: "hs-1", isCanonical: true }),
        claim({ matchedHealthSystemId: "hs-2" }),
        claim({ matchedHealthSystemId: "hs-3" }),
      ],
      { healthSystemId: "hs-1", healthSystemName: "Alpine Health" },
    );

    expect(count).toBe(2);
  });

  it("does not count claims that agree with the canonical assignment", () => {
    const count = countConflictingClaims(
      [
        claim({ matchedHealthSystemId: "hs-1", isCanonical: true }),
        claim({ matchedHealthSystemId: "hs-1" }),
      ],
      { healthSystemId: "hs-1", healthSystemName: "Alpine Health" },
    );

    expect(count).toBe(0);
  });

  it("ignores claims marked incorrect without deleting them", () => {
    const claims = [
      claim({ matchedHealthSystemId: "hs-1", isCanonical: true }),
      claim({ matchedHealthSystemId: "hs-9", markedIncorrect: true }),
    ];

    expect(
      countConflictingClaims(claims, {
        healthSystemId: "hs-1",
        healthSystemName: "Alpine Health",
      }),
    ).toBe(0);
    expect(claims).toHaveLength(2);
  });

  it("compares unmatched claims by normalized system name", () => {
    const claims = [
      claim({
        matchedHealthSystemId: "hs-1",
        claimedHealthSystemName: "Alpine Health",
        isCanonical: true,
      }),
      claim({
        matchedHealthSystemId: null,
        claimedHealthSystemName: "  alpine   health ",
      }),
      claim({
        matchedHealthSystemId: null,
        claimedHealthSystemName: "Beacon Health",
      }),
    ];

    expect(
      countConflictingClaims(claims, {
        healthSystemId: "hs-1",
        healthSystemName: "Alpine Health",
      }),
    ).toBe(1);
  });

  it("treats disagreeing claims on an unassigned hospital as conflicting", () => {
    const count = countConflictingClaims(
      [
        claim({ matchedHealthSystemId: "hs-1" }),
        claim({ matchedHealthSystemId: "hs-2" }),
        claim({ matchedHealthSystemId: "hs-3" }),
      ],
      { healthSystemId: null, healthSystemName: null },
    );

    expect(count).toBe(2);
  });

  it("reports no conflict for a single surviving claim on an unassigned hospital", () => {
    const count = countConflictingClaims(
      [
        claim({ matchedHealthSystemId: "hs-1" }),
        claim({ matchedHealthSystemId: "hs-2", markedIncorrect: true }),
      ],
      { healthSystemId: null, healthSystemName: null },
    );

    expect(count).toBe(0);
  });

  it("reports no conflict when a hospital has no claims at all", () => {
    expect(
      countConflictingClaims([], {
        healthSystemId: null,
        healthSystemName: null,
      }),
    ).toBe(0);
  });
});
