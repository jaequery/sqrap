// Norrly (norrly.io), a curated library of about 360 well-designed sites (Ramp,
// Intercom, Basement Studio, Legora, Zipline...), each recorded and broken down
// into its palette, fonts and a design prompt. Its sitemap lists every
// /inspiration/<slug> page; the listings link only to those pages, so one is
// fetched per new site for its JSON-LD, whose Article is `about` the site (its
// URL and name) and whose breadcrumb names the category (/category/<slug>),
// mapped to industry. Pages already stored as a site's sourceRef are not fetched
// again. robots.txt allows everything but accounts, checkout and the API.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://norrly.io";
const BATCH = 50;
const SITE_PAGE = /^https:\/\/norrly\.io\/inspiration\/[^/?#]+$/;

export const name = "norrly";

// Categories without an entry (hardware-mobility, other) carry none.
const INDUSTRY_BY_CATEGORY = {
  ai: "AI",
  "crypto-web3": "Crypto",
  "design-studios": "Agency & Portfolio",
  "dev-tools": "Developer tools",
  "e-commerce": "E-commerce",
  fintech: "Finance",
  "food-beverage": "Food & Drink",
  "health-wellness": "Health",
  "media-culture": "Media & Publishing",
  "saas-productivity": "SaaS",
};

// The page's JSON-LD nodes, flattened out of any @graph.
function jsonLd($) {
  return $("script[type='application/ld+json']").get().flatMap((el) => {
    try {
      const data = JSON.parse($(el).text());
      return [].concat(data).flatMap((d) => d?.["@graph"] ?? [d]);
    } catch {
      return [];
    }
  });
}

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const refs = [...new Set($map("url > loc").map((_, el) => $map(el).text().trim()).get().filter((u) => SITE_PAGE.test(u)))];
  if (!refs.length) console.warn(`[${name}] no /inspiration/ pages in the sitemap; its format may have changed`);
  let yielded = 0;
  for (let i = 0; i < refs.length && yielded < limit; i += BATCH) {
    const batch = refs.slice(i, i + BATCH);
    const known = await knownSourceRefs(batch);
    for (const ref of batch) {
      if (yielded >= limit) return;
      if (known.has(ref)) continue;
      let html;
      try {
        html = await fetchHtml(ref);
      } catch (err) {
        console.warn(`[${name}] skipping ${ref}: ${err.message}`);
        continue;
      }
      const nodes = jsonLd(cheerio.load(html));
      const site = nodes.find((n) => n?.["@type"] === "Article")?.about;
      if (!site?.url || /norrly\.io\b/i.test(site.url)) continue;
      const crumbs = nodes.find((n) => n?.["@type"] === "BreadcrumbList")?.itemListElement ?? [];
      const category = crumbs.map((c) => /\/category\/([^/?#]+)/.exec(c?.item ?? "")?.[1]).find(Boolean);
      yielded++;
      yield {
        url: site.url,
        name: String(site.name ?? "").replace(/\s+/g, " ").trim() || null,
        industryHint: INDUSTRY_BY_CATEGORY[category] ?? null,
        sourceRef: ref,
      };
    }
  }
}
