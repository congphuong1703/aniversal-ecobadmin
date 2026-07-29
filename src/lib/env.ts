import "server-only";

import { z } from "zod";

export const envSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(1),
  ADMIN_SESSION_SECRET: z.string().min(1),
  RSVP_VERIFICATION_SECRET: z.string().min(1),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cachedEnv: ServerEnv | undefined;

export function getEnv(): ServerEnv {
  cachedEnv ??= envSchema.parse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
    RSVP_VERIFICATION_SECRET: process.env.RSVP_VERIFICATION_SECRET,
  });

  return cachedEnv;
}
