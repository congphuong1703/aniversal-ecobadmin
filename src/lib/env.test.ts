// @vitest-environment node

import { describe, expect, it } from "vitest";

import { parseServerEnv } from "./env";

const BASE_ENV = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  ADMIN_PASSWORD: "admin-password",
  ADMIN_SESSION_SECRET: "admin-session-secret",
  RSVP_VERIFICATION_SECRET: "verification-secret",
};

describe("server environment validation", () => {
  it("allows short non-production and E2E fixtures", () => {
    expect(parseServerEnv({ ...BASE_ENV, NODE_ENV: "test" })).toMatchObject(
      BASE_ENV,
    );
  });

  it("accepts production credentials at the required entropy boundaries", () => {
    expect(
      parseServerEnv({
        ...BASE_ENV,
        NODE_ENV: "production",
        ADMIN_PASSWORD: "p".repeat(12),
        ADMIN_SESSION_SECRET: "a".repeat(32),
        RSVP_VERIFICATION_SECRET: "r".repeat(32),
      }),
    ).toMatchObject({
      ADMIN_PASSWORD: "p".repeat(12),
      ADMIN_SESSION_SECRET: "a".repeat(32),
      RSVP_VERIFICATION_SECRET: "r".repeat(32),
    });
  });

  it.each([
    ["ADMIN_PASSWORD", 11],
    ["ADMIN_SESSION_SECRET", 31],
    ["RSVP_VERIFICATION_SECRET", 31],
  ] as const)("rejects a short production %s", (field, length) => {
    expect(() =>
      parseServerEnv({
        ...BASE_ENV,
        NODE_ENV: "production",
        ADMIN_PASSWORD: "p".repeat(12),
        ADMIN_SESSION_SECRET: "a".repeat(32),
        RSVP_VERIFICATION_SECRET: "r".repeat(32),
        [field]: "x".repeat(length),
      }),
    ).toThrow();
  });
});
