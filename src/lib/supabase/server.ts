import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getEnv } from "@/lib/env";

let serverClient: SupabaseClient | undefined;

export function getSupabaseServerClient(): SupabaseClient {
  if (!serverClient) {
    const env = getEnv();

    serverClient = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return serverClient;
}
