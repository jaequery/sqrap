import { adminRoute, jobsAvailable, JOBS_OFF } from "../../../../lib/admin";
import { listJobs } from "../../../../lib/jobs";

export const dynamic = "force-dynamic";

// `available` is false where re-capture and re-judge cannot run (lib/admin.js).
export const GET = adminRoute(() => jobsAvailable() ? { items: listJobs(), available: true } : { items: [], available: false, reason: JOBS_OFF });
