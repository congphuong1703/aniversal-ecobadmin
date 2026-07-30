import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";

import type { NextResponse } from "next/server";
import { z } from "zod";

import { jsonError } from "@/lib/api-response";
import { isE2eMemoryRepositoryEnabled } from "@/lib/e2e-mode";
import { getEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type RateLimitPolicy = {
  bucket: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitBucket = {
  bucketHash: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export type RateLimitAdapter = {
  consume(input: RateLimitBucket): Promise<RateLimitResult>;
};

type MemoryBucket = {
  count: number;
  windowStartedAt: number;
};

type MemoryRateLimitStore = Map<string, MemoryBucket>;

const E2E_RATE_LIMIT_STORES_KEY = "__ecobadmintonE2eRateLimitStores";
const TRUSTED_CLIENT_ADDRESS_HEADERS = [
  "x-vercel-forwarded-for",
  "x-forwarded-for",
  "x-real-ip",
] as const;

export const RATE_LIMIT_POLICIES = {
  adminLogin: {
    bucket: "admin-login-client",
    limit: 5,
    windowSeconds: 10 * 60,
  },
  guestVerification: {
    bucket: "guest-verification-client",
    limit: 20,
    windowSeconds: 10 * 60,
  },
  rsvpWriteClient: {
    bucket: "rsvp-write-client",
    limit: 20,
    windowSeconds: 10 * 60,
  },
  rsvpWriteGuest: {
    bucket: "rsvp-write-guest",
    limit: 20,
    windowSeconds: 10 * 60,
  },
} satisfies Record<string, RateLimitPolicy>;

type GlobalWithE2eRateLimitStores = typeof globalThis & {
  [E2E_RATE_LIMIT_STORES_KEY]?: Map<string, MemoryRateLimitStore>;
};

function e2eRateLimitStores() {
  const globalState = globalThis as GlobalWithE2eRateLimitStores;
  globalState[E2E_RATE_LIMIT_STORES_KEY] ??= new Map();
  return globalState[E2E_RATE_LIMIT_STORES_KEY];
}

function e2eRateLimitStore(scope: string) {
  const stores = e2eRateLimitStores();
  let store = stores.get(scope);

  if (!store) {
    store = new Map();
    stores.set(scope, store);
  }

  return store;
}

export function getClientAddress(request: Request) {
  for (const header of TRUSTED_CLIENT_ADDRESS_HEADERS) {
    const candidate = request.headers.get(header)?.split(",", 1)[0]?.trim();

    if (candidate && isIP(candidate)) {
      return candidate;
    }
  }

  return "unknown";
}

export function createMemoryRateLimitAdapter(
  dependencies: {
    now?: () => number;
    store?: MemoryRateLimitStore;
  } = {},
): RateLimitAdapter {
  const now = dependencies.now ?? Date.now;
  const store = dependencies.store ?? new Map();

  return {
    async consume({ bucketHash, limit, windowSeconds }) {
      const currentTime = now();
      const windowMs = windowSeconds * 1000;
      const windowStartedAt = Math.floor(currentTime / windowMs) * windowMs;
      const key = `${bucketHash}:${windowStartedAt}`;
      const current = store.get(key);
      const count = (current?.count ?? 0) + 1;
      store.set(key, { count, windowStartedAt });

      return {
        allowed: count <= limit,
        retryAfterSeconds:
          count <= limit
            ? 0
            : Math.max(
                1,
                Math.ceil((windowStartedAt + windowMs - currentTime) / 1000),
              ),
      };
    },
  };
}

const rateLimitRpcResultSchema = z
  .array(
    z.object({
      allowed: z.boolean(),
      retry_after_seconds: z.number().int().nonnegative(),
    }),
  )
  .length(1);

const supabaseRateLimitAdapter: RateLimitAdapter = {
  async consume({ bucketHash, limit, windowSeconds }) {
    const { data, error } = await getSupabaseServerClient().rpc(
      "consume_rate_limit_bucket",
      {
        p_bucket_hash: bucketHash,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      },
    );

    if (error) {
      throw new Error("Unable to check rate limit.", { cause: error });
    }

    const [result] = rateLimitRpcResultSchema.parse(data);
    return {
      allowed: result.allowed,
      retryAfterSeconds: result.retry_after_seconds,
    };
  },
};

function defaultAdapter(e2eScope?: string) {
  if (!isE2eMemoryRepositoryEnabled()) {
    return supabaseRateLimitAdapter;
  }

  if (!e2eScope) {
    throw new Error("E2E rate limiting requires a worker scope.");
  }

  return createMemoryRateLimitAdapter({
    store: e2eRateLimitStore(e2eScope),
  });
}

export function resetE2eRateLimitState(scope: string) {
  e2eRateLimitStores().set(scope, new Map());
}

function hashBucketIdentifier(
  policy: RateLimitPolicy,
  identifier: string,
  secret: string,
) {
  return createHmac("sha256", secret)
    .update(`${policy.bucket}:${identifier}`, "utf8")
    .digest("hex");
}

export async function enforceRateLimit(
  request: Request,
  options: {
    policy: RateLimitPolicy;
    identifier?: string;
    e2eScope?: string;
    adapter?: RateLimitAdapter;
    hashSecret?: string;
  },
): Promise<NextResponse | null> {
  try {
    const adapter = options.adapter ?? defaultAdapter(options.e2eScope);
    const identifier = options.identifier ?? getClientAddress(request);
    const hashSecret = options.hashSecret ?? getEnv().RSVP_VERIFICATION_SECRET;
    const result = await adapter.consume({
      bucketHash: hashBucketIdentifier(options.policy, identifier, hashSecret),
      limit: options.policy.limit,
      windowSeconds: options.policy.windowSeconds,
    });

    if (result.allowed) {
      return null;
    }

    const response = jsonError(
      429,
      "RATE_LIMITED",
      "Too many requests. Try again later.",
    );
    response.headers.set(
      "Retry-After",
      String(Math.max(1, result.retryAfterSeconds)),
    );
    return response;
  } catch {
    return jsonError(
      503,
      "SERVICE_UNAVAILABLE",
      "Service temporarily unavailable.",
    );
  }
}
