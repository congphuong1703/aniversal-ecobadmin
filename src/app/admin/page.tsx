import { headers } from "next/headers";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminLogin } from "@/components/admin/admin-login";
import { readAdminSession } from "@/lib/admin-session";
import { E2E_WORKER_HEADER, normalizeE2eWorkerScope } from "@/lib/e2e-mode";
import { getAdminDashboard } from "@/lib/rsvp-repository";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let authenticated = false;

  try {
    authenticated = await readAdminSession();
  } catch {
    // Session configuration failures must fail closed without loading guest data.
  }

  if (!authenticated) {
    return <AdminLogin />;
  }

  const requestHeaders = await headers();
  const { summary, guests } = await getAdminDashboard(
    normalizeE2eWorkerScope(requestHeaders.get(E2E_WORKER_HEADER)),
  );
  return <AdminDashboard guests={guests} summary={summary} />;
}
