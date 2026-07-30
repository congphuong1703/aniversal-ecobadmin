// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createMemoryRateLimitAdapter,
  enforceRateLimit,
  getClientAddress,
  resetE2eRateLimitState,
  type RateLimitAdapter,
  type RateLimitPolicy,
} from "./rate-limit";

const POLICY: RateLimitPolicy = {
  bucket: "test-boundary",
  limit: 2,
  windowSeconds: 600,
};

function request(headers?: HeadersInit) {
  return new Request("http://localhost/example", { headers });
}

describe("rate limiting", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses trusted proxy address headers and safely falls back", () => {
    expect(
      getClientAddress(
        request({
          "x-vercel-forwarded-for": "203.0.113.7, 10.0.0.1",
          "x-forwarded-for": "198.51.100.2",
        }),
      ),
    ).toBe("203.0.113.7");
    expect(
      getClientAddress(
        request({ "x-forwarded-for": "198.51.100.2, 10.0.0.2" }),
      ),
    ).toBe("198.51.100.2");
    expect(getClientAddress(request({ "x-real-ip": "192.0.2.4" }))).toBe(
      "192.0.2.4",
    );
    expect(getClientAddress(request({ "x-forwarded-for": "not-an-ip" }))).toBe(
      "unknown",
    );
  });

  it("hashes identifiers before passing buckets to persistence", async () => {
    const consume = vi.fn<RateLimitAdapter["consume"]>().mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
    });

    await expect(
      enforceRateLimit(request(), {
        adapter: { consume },
        hashSecret: "test-hash-secret",
        identifier: "guest-01@example.invalid",
        policy: POLICY,
      }),
    ).resolves.toBeNull();

    expect(consume).toHaveBeenCalledOnce();
    const bucketHash = consume.mock.calls[0]?.[0].bucketHash;
    expect(bucketHash).toMatch(/^[a-f0-9]{64}$/);
    expect(bucketHash).not.toContain("guest-01");
    expect(JSON.stringify(consume.mock.calls[0]?.[0])).not.toContain(
      "guest-01@example.invalid",
    );
  });

  it("returns structured 429 JSON and Retry-After after the limit", async () => {
    const adapter = createMemoryRateLimitAdapter({
      now: () => Date.parse("2026-07-29T02:00:00.000Z"),
    });

    await expect(
      enforceRateLimit(request(), {
        adapter,
        hashSecret: "test-hash-secret",
        identifier: "203.0.113.8",
        policy: POLICY,
      }),
    ).resolves.toBeNull();
    await expect(
      enforceRateLimit(request(), {
        adapter,
        hashSecret: "test-hash-secret",
        identifier: "203.0.113.8",
        policy: POLICY,
      }),
    ).resolves.toBeNull();

    const response = await enforceRateLimit(request(), {
      adapter,
      hashSecret: "test-hash-secret",
      identifier: "203.0.113.8",
      policy: POLICY,
    });

    expect(response?.status).toBe(429);
    expect(response?.headers.get("retry-after")).toBe("600");
    expect(await response?.json()).toEqual({
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Try again later.",
      },
    });
  });

  it("fails closed with generic 503 JSON when the limiter cannot be checked", async () => {
    const response = await enforceRateLimit(request(), {
      adapter: {
        consume: vi.fn().mockRejectedValue(new Error("database unavailable")),
      },
      hashSecret: "test-hash-secret",
      policy: POLICY,
    });

    expect(response?.status).toBe(503);
    expect(await response?.json()).toEqual({
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Service temporarily unavailable.",
      },
    });
  });

  it("isolates the E2E memory adapter by Playwright worker scope", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("E2E_REPOSITORY", "memory");
    resetE2eRateLimitState("worker-a");
    resetE2eRateLimitState("worker-b");
    const oneAttemptPolicy = { ...POLICY, limit: 1 };
    const options = {
      hashSecret: "test-hash-secret",
      identifier: "same-client",
      policy: oneAttemptPolicy,
    };

    await expect(
      enforceRateLimit(request(), { ...options, e2eScope: "worker-a" }),
    ).resolves.toBeNull();
    await expect(
      enforceRateLimit(request(), { ...options, e2eScope: "worker-b" }),
    ).resolves.toBeNull();

    const limited = await enforceRateLimit(request(), {
      ...options,
      e2eScope: "worker-a",
    });
    expect(limited?.status).toBe(429);
  });
});
