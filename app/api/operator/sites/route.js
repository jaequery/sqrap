import { jsonBody } from "../../../../lib/admin";
import { addSeeds, siteStatuses } from "../../../../lib/admin-data";
import { httpError, operatorRoute } from "../../../../lib/operator";

export const dynamic = "force-dynamic";

// Operator API (lib/operator.js): Bearer $SQRAP_INGEST_TOKEN, else 404.

// Adds sites to the pipeline as `discovered`, the same way `npm run seed` does:
// opt-outs are refused here and robots.txt is checked at capture. The cron
// route then captures and judges them.
// Body: { urls: ["https://a.com", ...] } or { urls: "one URL per line" }, at most 100.
// Returns { results: [{ url, result: "inserted" | "known" | <refusal reason> }] }.
export const POST = operatorRoute(async (request) => addSeeds((await jsonBody(request)).urls, "operator"));

// Where each site is in the pipeline: ?domains=a.com,b.com (at most 100).
// Returns [{ domain, site: { status, quality, reasons, scores, captureProblem, lastError, ... } | null,
// optout, home: [{ platform, sm, lg }] }]. The /shots URLs answer the same token.
export const GET = operatorRoute(async (request) => {
  const domains = (new URL(request.url).searchParams.get("domains") || "").split(",").map((d) => d.trim()).filter(Boolean);
  if (!domains.length) throw httpError(400, "Pass ?domains=a.com,b.com", { domains: "Comma-separated domains" });
  return siteStatuses(domains);
});
