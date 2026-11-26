import { adminRoute } from "../../../../lib/admin";
import { recentlyScraped, scrapeStats } from "../../../../lib/admin-data";

export const dynamic = "force-dynamic";

// ?range=day|month (default and fallback day): scrape counts per UTC day (30)
// or month (12), totals, and the most recently scraped sites.
export const GET = adminRoute(async (request) => {
  const range = new URL(request.url).searchParams.get("range") || "day";
  const [stats, recent] = await Promise.all([scrapeStats({ range }), recentlyScraped({ limit: 50 })]);
  return { ...stats, recent };
});
