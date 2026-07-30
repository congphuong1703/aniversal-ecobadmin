import "server-only";

import { z } from "zod";

import { E2E_WORKER_HEADER, normalizeE2eWorkerScope } from "@/lib/e2e-mode";

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
  return normalizeE2eWorkerScope(request.headers.get(E2E_WORKER_HEADER));
}
