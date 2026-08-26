import type { FullConfig } from "@playwright/test";

// Next.js dev (Turbopack) compiles each route on its first request. Hitting
// every route the suite depends on here, before workers start, avoids that
// one-time compile lag pushing a real assertion past its timeout mid-test.
const WARMUP_REQUESTS: Array<{
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
}> = [
  { path: "/" },
  { path: "/story" },
  { path: "/admin" },
  { path: "/api/guests" },
  { path: "/api/test/reset", method: "POST", body: { submissions: [] } },
  {
    path: "/api/rsvp/verify",
    method: "POST",
    body: { guestId: "warmup", name: "warmup" },
  },
  {
    path: "/api/rsvp",
    method: "POST",
    body: { verificationToken: "warmup", attending: true, message: null },
  },
  { path: "/api/test/rsvp-state" },
];

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? "http://127.0.0.1:3108";

  await Promise.all(
    WARMUP_REQUESTS.map(({ path, method = "GET", body }) =>
      fetch(new URL(path, baseURL), {
        method,
        headers: {
          "content-type": "application/json",
          "x-e2e-worker-id": "warmup",
        },
        body: body ? JSON.stringify(body) : undefined,
      }).catch(() => undefined),
    ),
  );
}
