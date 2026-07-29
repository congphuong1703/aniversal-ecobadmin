// @vitest-environment node

import { describe, expect, it } from "vitest";

import { isE2eMemoryRepositoryEnabled } from "./e2e-mode";

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
