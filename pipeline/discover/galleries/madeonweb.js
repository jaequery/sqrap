// Made on Web (madeonweb.com), "a curated library of real, well-built websites"
// by Simov Studio: about 270 brand, store and product sites (Branch, Polestar,
// Raycast, Tony's Chocolonely, Fellow, Wise...), each captured whole and cut
// into pages and sections. Its sitemap lists every /website/<slug>/ page newest
// first (the paged listing loads from /api/, which robots.txt disallows), so one
// page is fetched per new site for its JSON-LD: the CreativeWork entry's `about`
// is the site's WebSite node (name and URL) and its keywords start with the
// industry, then the site types. Pages already stored as a site's sourceRef are
// not fetched again. robots.txt allows everything but /api/ to other crawlers.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://madeonweb.com";
const BATCH = 50;
const SITE_PAGE = /^https:\/\/madeonweb\.com\/website\/[^/?#]+\/$/;

export const name = "madeonweb";

// Made on Web industry → lib/taxonomy.js INDUSTRIES. Art & Culture, Home &
// Electronics and Mobile Apps fall back to the site type, else no hint.
const INDUSTRY = {
  "ai & automation": "AI",
  communities: "Community & Social",
  "education & consulting": "Education",
  entertainment: "Entertainment",
  "fashion & beauty": "Fashion",
  "finance & legal": "Finance",
  "food & drinks": "Food & Drink",
  "health & wellness": "Health",
  "marketing & design": "Agency & Portfolio",
  "news & media": "Media & Publishing",
  "real estate": "Real estate",
  "saas & software": "SaaS",
  "sports & fitness": "Health",
  "travel & hospitality": "Travel",
};

const INDUSTRY_BY_TYPE = { ecommerce: "E-commerce", portfolio: "Agency & Portfolio" };

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
  if (!refs.length) console.warn(`[${name}] no /website/ pages in the sitemap; its format may have changed`);
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
      const entry = jsonLd(cheerio.load(html)).find((n) => n?.["@type"] === "CreativeWork" && n.about?.url);
      const url = String(entry?.about?.url ?? "").trim();
      if (!/^https?:\/\//i.test(url) || /^https?:\/\/([^/]+\.)?madeonweb\.com\b/i.test(url)) continue;
      const keywords = String(entry.keywords ?? "").split(",").map((k) => k.trim().toLowerCase());
      yielded++;
      yield {
        url,
        name: String(entry.about.name ?? "").replace(/\s+/g, " ").trim() || null,
        industryHint: INDUSTRY[keywords[0]] ?? keywords.map((k) => INDUSTRY_BY_TYPE[k]).find(Boolean) ?? null,
        sourceRef: ref,
      };
    }
  }
}
