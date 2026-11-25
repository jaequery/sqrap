// KASOU (kasoudesign.com), a Japanese web design gallery that working web
// designers update daily with a comment on each pick, and that keeps the
// lower pages of every site as well as its top page: about 1,400 corporate,
// recruiting, brand, shop and campaign sites from Japan (Morisawa Fonts' new
// typeface page, JUN's Rope Picnic collaboration, Tarumi Railway). Its sitemap
// lists every /website/<id>/ page; ids rise with time, so they are read highest
// first. The listings link only to those pages, so one is fetched per new site
// for the outbound link under its heading (a.url), which goes straight to the
// site. Pages already stored as a site's sourceRef are not fetched again, and a
// page without that link (a withdrawn entry) is passed over. robots.txt only
// bars query strings and the contact form. The gallery files industries as
// listing pages, not on the site's own page, so no industry is mapped.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://kasoudesign.com";
const BATCH = 50;
const SITE_PAGE = /^https:\/\/kasoudesign\.com\/website\/(\d+)\/$/;

export const name = "kasou";

// The /website/<id>/ pages in the sitemap, newest (highest id) first.
export function sitePages(xml) {
  const pages = new Map();
  for (const [, loc] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const m = loc.trim().match(SITE_PAGE);
    if (m) pages.set(m[0], Number(m[1]));
  }
  return [...pages].sort((a, b) => b[1] - a[1]).map(([url]) => url);
}

// The site a /website/<id>/ page features, or null when it has no outbound link.
export function parse($, ref) {
  const head = $(".p-single__text").first();
  const url = head.find("a.url[href^='http']").first().attr("href")?.trim();
  if (!url || /^https?:\/\/([^/]+\.)?kasoudesign\.com\b/i.test(url)) return null;
  // Titles read "<name> [<what it does>]" or "<name> | <tagline>", with ASCII
  // or full-width brackets and bars.
  const title = head.find("h1.title").first().text().replace(/\s+/g, " ").trim();
  const short = title.replace(/\s*[[［【].*$/, "").split(/｜|\s[|–—-]\s/)[0].trim();
  return { url, name: short || null, sourceRef: ref };
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
    console.warn(`[${name}] no /website/<id>/ pages in the sitemap; its format may have changed`);
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
