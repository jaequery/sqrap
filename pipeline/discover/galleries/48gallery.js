// 48 Gallery (48gallery.com), a hand-picked gallery of about 145 websites
// (designer and developer portfolios, studios, photographers, fashion,
// architecture and culture sites: A24 by Ravi Klaassens, Phantom, the CFDA's
// United Flags of Fashion, Bureau Nicolas Leuliet, Made by Igor). Its Framer
// sitemap lists every /inspiration/<slug> page, the newest picks first (the
// first fourteen are the home page's cards, in its order), and is read in that
// order. Category pages show only fourteen cards each, so one detail page is
// fetched per new site for the link under its heading, which goes straight to
// the site. The pages carry no category or date, so no industry is hinted.
// Pages already stored as a site's sourceRef are not fetched again. robots.txt
// allows everything.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://48gallery.com";
const BATCH = 50;
const SITE_PAGE = /^https:\/\/48gallery\.com\/inspiration\/[^/?#\s]+$/;
const OWN = /^https?:\/\/([^/]+\.)?(48gallery\.com|framer\.(com|link)|framerusercontent\.com)\b/i;

export const name = "48gallery";

// The /inspiration/<slug> pages in the sitemap, in its order (newest first).
export function sitePages(xml) {
  const seen = new Set();
  for (const [, loc] of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) {
    if (SITE_PAGE.test(loc)) seen.add(loc);
  }
  return [...seen];
}

// The site an /inspiration/<slug> page features, or null when it has no outbound link.
export function parse($, ref) {
  const title = $("h1").first().text().replace(/\s+/g, " ").trim();
  const url = $("a[href^='http']")
    .map((_, a) => $(a).attr("href").trim())
    .get()
    .find((href) => !OWN.test(href));
  if (!url) return null;
  return { url, name: title || null, sourceRef: ref };
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
    console.warn(`[${name}] no /inspiration/<slug> pages in the sitemap; its format may have changed`);
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
