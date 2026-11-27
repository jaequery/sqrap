import { adminRoute } from "../../../../lib/admin";
import { judgeHealth } from "../../../../lib/db";

export const dynamic = "force-dynamic";

// The judge's health for the admin's stalled warning: { lastJudgedAt, waiting,
// lastError, lastErrorAt, stalled }. The same computation as the cron route's
// `judge` block; the database is shared, so it holds wherever the admin runs.
export const GET = adminRoute(() => judgeHealth());
