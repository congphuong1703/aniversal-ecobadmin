import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminLogin } from "@/components/admin/admin-login";
import { readAdminSessionMetadata } from "@/lib/admin-session";

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
  const session = await readSessionFailClosed();

  if (!session) {
    return <AdminLogin />;
  }

  return <AdminDashboard />;
}
