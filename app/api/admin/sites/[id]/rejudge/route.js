import { adminRoute, httpError, jobsAvailable, JOBS_OFF } from "../../../../../../lib/admin";
import { rejudge } from "../../../../../../lib/admin-data";

export const dynamic = "force-dynamic";

// Queues a background job; poll GET /api/admin/jobs for its state. 501 where
// background jobs cannot run (jobsAvailable in lib/admin.js).
export const POST = adminRoute(async (request, { params }) => {
  if (!jobsAvailable()) throw httpError(501, JOBS_OFF);
  return rejudge((await params).id);
});
