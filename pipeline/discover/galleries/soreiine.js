// Soreiine!! (soreiine.jp), a Japanese gallery in which a working web director
// picks sites they think are good and says why under each one ("ディレクターより",
// with a short list of what works): about 590 since 2021, mostly Japanese
// corporate, recruiting, brand, shop and campaign sites (Zoff's recruiting site,
// SHOES CONCIERGE, clinics, schools, design studios). Its post sitemap lists
// every pick as /industry/<slug>/<id>/ (a few older ones as /type/<slug>/<id>/)
// with a lastmod, read newest first. The listings link only to those pages, so
// one is fetched per new site for the link on its screenshot, which goes
// straight to the site (the link under the site's name is the same address).
// Pages already stored as a site's sourceRef are not fetched again. The page's
// own industry category maps to an industry, falling back to its online-shop
// type. robots.txt only bars /wp-admin/.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://soreiine.jp";
const BATCH = 50;
const SITE_PAGE = /^https:\/\/soreiine\.jp\/(?:industry|type)\/(?:[a-z0-9_-]+\/)?\d+\/$/;

export const name = "soreiine";

// Industry category slugs to INDUSTRIES. Recruiting, corporate, art, local
// information, web services, photo, leisure, sport, infrastructure, gadgets,
// environment, animals, kids, livingware and weddings say nothing an industry
// can hold, so they stay unmapped.
const INDUSTRY = {
  design: "Agency & Portfolio",
  portfolio: "Agency & Portfolio",
  food_drink: "Food & Drink",
  restaurant: "Food & Drink",
  architecture: "Architecture & Interior",
  interior: "Architecture & Interior",
  fashion: "Fashion",
  beauty: "Fashion",
  accessories: "Fashion",
  bag: "Fashion",
  education: "Education",
  hospital: "Health",
  media: "Media & Publishing",
  travel: "Travel",
  "travel-industry": "Travel",
  financial: "Finance",
  car: "Automotive",
  shop: "E-commerce",
  music: "Music",
  game: "Entertainment",
  movie: "Entertainment",
  tv: "Entertainment",
};
// Site types that name an industry when no industry category does.
const TYPE_INDUSTRY = { ecsite: "E-commerce" };

// The pick pages in the post sitemap, most recently changed first.
export function sitePages(xml) {
  const pages = new Map();
  for (const [, block] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = block.match(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]]+?)\s*(?:\]\]>)?\s*<\/loc>/)?.[1];
    if (!loc || !SITE_PAGE.test(loc)) continue;
    const mod = Date.parse(block.match(/<lastmod>\s*(?:<!\[CDATA\[)?\s*([^<\]]+?)\s*(?:\]\]>)?\s*<\/lastmod>/)?.[1]) || 0;
    pages.set(loc, Math.max(mod, pages.get(loc) ?? 0));
  }
  return [...pages].sort((a, b) => b[1] - a[1]).map(([url]) => url);
}

// The slugs of the page's own /category/<kind>/ links (the sidebar and the
// related picks repeat others, so only the header is read).
function slugs($, kind) {
  const prefix = `${BASE}/category/${kind}/`;
  return $("header.entry-header-top .entry-category a")
    .map((_, a) => $(a).attr("href") ?? "")
    .get()
    .filter((href) => href.startsWith(prefix))
    .map((href) => href.slice(prefix.length).replace(/\/$/, ""));
}

const external = (href) => href && /^https?:\/\//i.test(href) && !/^https?:\/\/([^/]+\.)?soreiine\.jp\b/i.test(href);

// The site a pick page features, or null when it has no outbound link.
export function parse($, ref) {
  let url = $(".entry-media a[href]").first().attr("href")?.trim();
  if (!external(url)) {
    url = $(".entry-content a[href]")
      .map((_, a) => $(a).attr("href")?.trim())
      .get()
      .find(external);
  }
  if (!url) return null;
  const industry = slugs($, "industry").map((s) => INDUSTRY[s]).find(Boolean);
  const type = slugs($, "type").map((s) => TYPE_INDUSTRY[s]).find(Boolean);
  return { url, name: siteName($), industryHint: industry ?? type ?? null, sourceRef: ref };
}

// The name above the link. Some picks put a logo image there instead, named by its
// alt text, and on a few its unclosed tag swallows the review below it, so a name
// that runs long or is only an address is dropped.
function siteName($) {
  const head = $(".entry-content h2.site-name").first();
  const name = (head.find("img[alt]").first().attr("alt") || head.text()).replace(/\s+/g, " ").trim();
  return name && name.length <= 100 && !/^https?:\/\//i.test(name) ? name : null;
}

export async function* listing({ limit }) {
  let refs;
  try {
    refs = sitePages(await fetchHtml(`${BASE}/post-sitemap.xml`));
  } catch (err) {
    console.warn(`[${name}] skipping: ${err.message}`);
    return;
  }
  if (!refs.length) {
    console.warn(`[${name}] no pick pages in the post sitemap; its format may have changed`);
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
