import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { isAdminRequest } from "../../lib/admin";
import Admin from "./Admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sqrap admin",
  robots: { index: false, follow: false },
};

// Curation. Exists only for a loopback request with SQRAP_ADMIN=1 or a signed-in admin; see lib/admin.js.
export default async function AdminPage() {
  if (!(await isAdminRequest(await headers()))) notFound();
  return <Admin />;
}
