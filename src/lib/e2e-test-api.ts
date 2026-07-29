import "server-only";

import { z } from "zod";

import { E2E_WORKER_HEADER } from "@/lib/e2e-mode";

export const e2eResetSchema = z.object({
  submissions: z
    .array(
      z.object({
        guestId: z.string().min(1).max(100),
        attending: z.boolean(),
        message: z.string().max(1000).nullable(),
        clientSubmissionId: z.uuid(),
      }),
    )
    .max(100)
    .default([]),
});

export function readE2eWorkerScope(request: Request) {
  const scope = request.headers.get(E2E_WORKER_HEADER)?.trim();

  if (!scope || !/^[a-zA-Z0-9_-]{1,64}$/.test(scope)) {
    return null;
  }

  return scope;
}
