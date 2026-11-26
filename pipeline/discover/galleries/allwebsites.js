// AllWebsites.Design (allwebsites.design), a curated design-research archive of
// about 300 real websites (basement.studio, Auth0, Apple, AngelList, 8px, Annot,
// studio and personal portfolios), each studied for its palette, type and stack.
// The archive page renders its cards client-side with no outbound links, but the
// sitemap lists every /archive/<slug> page (alphabetical, no dates), so one page
// is fetched per new site for its JSON-LD: the WebSite node with an @id ending in
// #studiedsite carries the site's URL and name, and the breadcrumb names the
// category (Agency & Studio, Technology & SaaS, Finance...), mapped to industry.
// Pages already stored as a site's sourceRef are not fetched again. robots.txt
// allows everything but /api/.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://allwebsites.design";
const BATCH = 50;
const SITE_PAGE = /^https:\/\/allwebsites\.design\/archive\/[^/?#\s]+$/;
const OWN = /^https?:\/\/([^/]+\.)?allwebsites\.design\b/i;

export const name = "allwebsites";

// The /archive/<slug> pages in the sitemap, in its order.
export function sitePages(xml) {
  const seen = new Set();
  for (const [, loc] of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) {
    if (SITE_PAGE.test(loc)) seen.add(loc);
  }
  return [...seen];
}

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

// The site an /archive/<slug> page studies, or null when its JSON-LD names none.
export function parse($, ref) {
  const nodes = jsonLd($);
  const site =
    nodes.find((n) => n?.["@type"] === "WebSite" && /#studiedsite$/.test(n["@id"] ?? "") && n.url) ??
    nodes.find((n) => n?.["@type"] === "WebSite" && n.url && !OWN.test(n.url));
  if (!site || OWN.test(site.url)) return null;
  const crumbs = nodes.find((n) => n?.["@type"] === "BreadcrumbList")?.itemListElement ?? [];
  const category = crumbs.find((c) => /\/c\/[^/]+$/.test(c?.item ?? ""))?.name ?? site.about;
  return {
    url: site.url,
    name: String(site.name ?? "").replace(/\s+/g, " ").trim() || null,
    industryHint: industryFromTags(typeof category === "string" ? category : null),
    sourceRef: ref,
  };
}

export async function* listing({ limit }) {
  let refs;
  try {
    refs = sitePages(await fetchHtml(`${BASE}/sitemap.xml`));
  } catch (err) {
    console.warn(`[${name}] skipping: ${err.message}`);
    return;
  }
  if (!refs.length) {
    console.warn(`[${name}] no /archive/<slug> pages in the sitemap; its format may have changed`);
    return;
  }
  let yielded = 0;
  for (let i = 0; i < refs.length && yielded < limit; i += BATCH) {
    const batch = refs.slice(i, i + BATCH);
    const known = await knownSourceRefs(batch);
    for (const ref of batch) {
      if (yielded >= limit) return;
      if (known.has(ref)) continue;
      let site;
      try {
        site = parse(cheerio.load(await fetchHtml(ref)), ref);
      } catch (err) {
        console.warn(`[${name}] skipping ${ref}: ${err.message}`);
        continue;
      }
      if (!site) continue;
      yielded++;
      yield site;
    }
  }
}
