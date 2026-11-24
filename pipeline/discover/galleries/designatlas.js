// Design Atlas (designatlas.in), a hand-picked collection of about 1,150 of the
// web's best-designed sites (DixonBaxi, The New Yorker, Bun, Works in Progress...)
// by the studio 3Level, filed by industry, type and style. Its sitemap lists every
// /sites/<slug> page, newest first; the listings link only to those pages, so one
// is fetched per new site for its JSON-LD, whose WebSite node carries the site's
// URL, name and type (genre) and whose breadcrumb names the industry
// (/websites?region=<slug>). Pages already stored as a site's sourceRef are not
// fetched again. robots.txt allows the site pages to every crawler.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://designatlas.in";
const BATCH = 50;
const SITE_PAGE = /^https:\/\/designatlas\.in\/sites\/[^/?#]+$/;

export const name = "designatlas";

// Regions without an entry (design, hardware, climate) fall back to the site's type.
const INDUSTRY_BY_REGION = {
  ai: "AI",
  "developer-tools": "Developer tools",
  finance: "Finance",
  productivity: "Productivity",
  commerce: "E-commerce",
  media: "Media & Publishing",
  health: "Health",
  education: "Education",
  travel: "Travel",
};

const INDUSTRY_BY_GENRE = {
  studio: "Agency & Portfolio",
  portfolio: "Agency & Portfolio",
  shop: "E-commerce",
  editorial: "Media & Publishing",
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
  if (!refs.length) console.warn(`[${name}] no /sites/ pages in the sitemap; its format may have changed`);
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
      const site = nodes.find((n) => n?.["@type"] === "WebSite" && n.url && !/designatlas\.in\b/i.test(n.url));
      if (!site) continue;
      const crumbs = nodes.find((n) => n?.["@type"] === "BreadcrumbList")?.itemListElement ?? [];
      const region = crumbs.map((c) => /[?&]region=([^&#]+)/.exec(c?.item ?? "")?.[1]).find(Boolean);
      const genre = String(site.genre ?? "").toLowerCase();
      yielded++;
      yield {
        url: site.url,
        name: String(site.name ?? "").replace(/\s+/g, " ").trim() || null,
        industryHint: INDUSTRY_BY_REGION[region] ?? INDUSTRY_BY_GENRE[genre] ?? null,
        sourceRef: ref,
      };
    }
  }
}
