// Recent (recent.design), the gallery Godly became: Godly's hand-picked
// website archive (Augen, Displace, Interfere, Shopify Editions...) beside
// posts from X and Instagram. Its pages render client-side from an oRPC API on
// api.recent.design; `items.list` filtered to format "site" returns the
// website picks newest first, 50 a request with a `nextCursor`, so the whole
// archive (about 100 sites, the newest from July 2026) takes three requests.
// Each item's `source.url` is the site and its /i/<id>-<slug> page is the
// sourceRef, so no page per site is fetched. The category (agency, portfolio,
// ecommerce, saas, food-drink...) is mapped to an industry. robots.txt on both
// hosts allows everything but named AI training crawlers.
import { fetchJson } from "../http.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://recent.design";
const API = "https://api.recent.design/rpc/items/list";
const PER_PAGE = 50;
const MAX_PAGES = 20;

export const name = "recent";

export async function* listing({ limit }) {
  let cursor;
  let yielded = 0;
  for (let page = 0; page < MAX_PAGES && yielded < limit; page++) {
    const res = await fetchJson(API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ json: { format: "site", sort: "recent", limit: PER_PAGE, cursor } }),
    });
    const items = res?.json?.items;
    if (!Array.isArray(items) || !items.length) {
      if (!page) console.warn(`[${name}] no sites from ${API}; its API may have changed`);
      return;
    }
    for (const item of items) {
      if (yielded >= limit) return;
      const url = item?.source?.url;
      if (item.format !== "site" || item.source?.type !== "website" || !/^https?:\/\//i.test(url ?? "")) continue;
      if (!item.id || !item.slug) continue;
      yielded++;
      yield {
        url,
        name: item.title?.trim() || null,
        industryHint: industryFromTags(item.category?.slug?.replace(/-/g, " ")),
        sourceRef: `${BASE}/i/${item.id}-${item.slug}`,
      };
    }
    cursor = res.json.nextCursor;
    if (!cursor) return;
  }
}
