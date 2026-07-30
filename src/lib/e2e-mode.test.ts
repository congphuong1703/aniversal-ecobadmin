// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  isE2eMemoryRepositoryEnabled,
  normalizeE2eWorkerScope,
} from "./e2e-mode";

describe("E2E repository mode", () => {
  it("enables memory storage only for an explicit non-production process", () => {
    expect(
      isE2eMemoryRepositoryEnabled({
        NODE_ENV: "test",
        E2E_REPOSITORY: "memory",
      }),
    ).toBe(true);
    expect(
      isE2eMemoryRepositoryEnabled({
        NODE_ENV: "development",
        E2E_REPOSITORY: "memory",
      }),
    ).toBe(true);
  });

  it.each([
    { NODE_ENV: "production", E2E_REPOSITORY: "memory" },
    { NODE_ENV: "test", E2E_REPOSITORY: undefined },
    { NODE_ENV: "test", E2E_REPOSITORY: "supabase" },
  ])("rejects unsafe or implicit configuration %#", (environment) => {
    expect(isE2eMemoryRepositoryEnabled(environment)).toBe(false);
  });
});

describe("E2E worker scope", () => {
  it("trims a valid explicit scope", () => {
    expect(normalizeE2eWorkerScope("  worker-12_mobile  ")).toBe(
      "worker-12_mobile",
    );
  });

  it.each([null, "", "contains spaces", "contains/slash", "x".repeat(65)])(
    "rejects a missing or malformed scope %#",
    (scope) => {
      expect(normalizeE2eWorkerScope(scope)).toBeUndefined();
    },
  );
});
