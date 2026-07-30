import { headers } from "next/headers";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminLogin } from "@/components/admin/admin-login";
import { readAdminSessionMetadata } from "@/lib/admin-session";
import { E2E_WORKER_HEADER, normalizeE2eWorkerScope } from "@/lib/e2e-mode";
import { getAdminDashboard } from "@/lib/rsvp-repository";

export const dynamic = "force-dynamic";

async function readSessionFailClosed() {
  try {
    return await readAdminSessionMetadata();
  } catch {
    // Session configuration failures must fail closed.
    return null;
  }
}

export default async function AdminPage() {
  const initialSession = await readSessionFailClosed();

  if (!initialSession) {
    return <AdminLogin />;
  }

  const requestHeaders = await headers();
  const { summary, guests } = await getAdminDashboard(
    normalizeE2eWorkerScope(requestHeaders.get(E2E_WORKER_HEADER)),
  );
  const renderSession = await readSessionFailClosed();

  if (!renderSession) {
    return <AdminLogin />;
  }

  return (
    <AdminDashboard
      guests={guests}
      sessionExpiresAt={renderSession.expiresAt}
      sessionServerTime={renderSession.serverTime}
      summary={summary}
    />
  );
}
