import "server-only";

import { z } from "zod";

export const envSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(1),
  ADMIN_SESSION_SECRET: z.string().min(1),
  RSVP_VERIFICATION_SECRET: z.string().min(1),
});

const productionEnvSchema = envSchema.extend({
  ADMIN_PASSWORD: z.string().min(12),
  ADMIN_SESSION_SECRET: z.string().min(32),
  RSVP_VERIFICATION_SECRET: z.string().min(32),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cachedEnv: ServerEnv | undefined;

export function parseServerEnv(
  environment: Partial<Record<string, string | undefined>>,
): ServerEnv {
  const schema =
    environment.NODE_ENV === "production" ? productionEnvSchema : envSchema;

  return schema.parse({
    SUPABASE_URL: environment.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: environment.SUPABASE_SERVICE_ROLE_KEY,
    ADMIN_PASSWORD: environment.ADMIN_PASSWORD,
    ADMIN_SESSION_SECRET: environment.ADMIN_SESSION_SECRET,
    RSVP_VERIFICATION_SECRET: environment.RSVP_VERIFICATION_SECRET,
  });
}

export function getEnv(): ServerEnv {
  cachedEnv ??= parseServerEnv(process.env);

  return cachedEnv;
}
