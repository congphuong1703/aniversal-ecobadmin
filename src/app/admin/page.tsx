import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminLogin } from "@/components/admin/admin-login";
import { readAdminSession } from "@/lib/admin-session";
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

  const { summary, guests } = await getAdminDashboard();
  return <AdminDashboard guests={guests} summary={summary} />;
}
