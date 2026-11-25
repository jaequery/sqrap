// Mooiste Websites (mooistewebsites.nl), a Dutch gallery that has collected
// custom-built sites since 2022, about 510 of them, each with a short write-up
// of its colors, type and details: Worldstream, Wero, Avans Hogeschool,
// VluchtelingenWerk Nederland, Gazelle, Gumroad, Moooi. Mostly Dutch and Belgian
// companies, schools and nonprofits, with some international brands. Its sitemap
// lists every /website/<slug> page with a lastmod, read newest first. The
// listings link only to those pages, so one is fetched per new site for the
// "Bezoek website" button under its heading, which goes straight to the site
// (the "Ontworpen door" link above it credits the studio and is passed over).
// Pages already stored as a site's sourceRef are not fetched again. The page's
// own categories (and its Webshops, Portfolio and Internetbureau tags) map to an
// industry, its Nederland and België tags to a country. robots.txt only bars
// /admin/, color and image filters and the /go/ redirects, none of which are read.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://mooistewebsites.nl";
const BATCH = 50;
const SITE_PAGE = /^https:\/\/mooistewebsites\.nl\/website\/[a-z0-9-]+$/;

export const name = "mooistewebsites";

// Category and tag slugs to INDUSTRIES, most specific first: a page filed under
// both Startups and Fintech is Finance. The page's categories are checked before
// its tags. B2B, B2C, Bedrijven en zakelijk,
// Technologie en industrie, Kinderen, Dier en natuur and Recruitment say
// nothing an industry can hold, so they stay unmapped.
const INDUSTRY = {
  fintech: "Finance",
  "welzijn-gezondheid": "Health",
  "beauty-mode": "Fashion",
  "eten-drinken": "Food & Drink",
  horeca: "Food & Drink",
  "reizen-vakantie": "Travel",
  "onderwijs-kunst-cultuur": "Education",
  "muziek-geluid": "Music",
  "film-tv": "Entertainment",
  "entertainment-games": "Entertainment",
  "evenementen-conferenties": "Entertainment",
  automotive: "Automotive",
  "non-profit-goede-doelen": "Nonprofit",
  webshops: "E-commerce",
  internetbureau: "Agency & Portfolio",
  portfolio: "Agency & Portfolio",
  blogs: "Media & Publishing",
  "startups-mobile-apps": "SaaS",
};
const COUNTRY = { nederland: "NL", belgie: "BE" };

// The /website/<slug> pages in the sitemap, most recently changed first.
export function sitePages(xml) {
  const pages = new Map();
  for (const [, block] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = block.match(/<loc>\s*([^<]+?)\s*<\/loc>/)?.[1];
    if (!loc || !SITE_PAGE.test(loc)) continue;
    const mod = Date.parse(block.match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/)?.[1]) || 0;
    pages.set(loc, Math.max(mod, pages.get(loc) ?? 0));
  }
  return [...pages].sort((a, b) => b[1] - a[1]).map(([url]) => url);
}

// The slugs of the page's own /category/ or /tag/ links (the footer repeats
// site-wide lists under the same paths, so only the block under the header is read).
function slugs($, kind) {
  const label = kind === "category" ? "Categorieën" : "Tags";
  const block = $(".row-columns .col").filter((_, el) => $(el).children("p").first().text().trim() === label).first();
  return block
    .find(`a[href^="${BASE}/${kind}/"]`)
    .map((_, a) => $(a).attr("href").slice(`${BASE}/${kind}/`.length).replace(/\/$/, ""))
    .get();
}

// The site a /website/<slug> page features, or null when it has no outbound link.
export function parse($, ref) {
  const url = $("header a.btn-primary[href^='http']").first().attr("href")?.trim();
  if (!url || /^https?:\/\/([^/]+\.)?mooistewebsites\.nl\b/i.test(url)) return null;
  const categories = slugs($, "category");
  const tags = slugs($, "tag");
  const industryOf = (list) => Object.keys(INDUSTRY).find((slug) => list.includes(slug));
  const slug = industryOf(categories) ?? industryOf(tags);
  const industryHint = slug ? INDUSTRY[slug] : null;
  const countryHint = tags.map((s) => COUNTRY[s]).find(Boolean) ?? null;
  const title = $("header h1.title").first().text().replace(/\s+/g, " ").trim();
  return { url, name: title || null, industryHint, countryHint, sourceRef: ref };
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
    console.warn(`[${name}] no /website/<slug> pages in the sitemap; its format may have changed`);
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
