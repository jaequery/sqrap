// WebCity (webcity.design), "The Best Web Design Inspiration", a gallery that one
// designer (Shahrukh Qureshi) picks and builds in Framer: about 105 sites, mostly AI,
// SaaS, technology and fintech products, studios and portfolios (Relume, Antimetal,
// Agiloft, Tender, Trevor Noah), each with a page of its own at /websites/<slug> that
// names the site and links out to it. Its /websites/ page lists every site and its
// 18 category pages (/websites/<category>/); each site is in exactly one category, so
// the category pages are read first (one request each) to hint an industry, then the
// site pages in the order /websites/ lists them, one request per site not yet stored
// (pages already stored as a site's sourceRef are not fetched again). Links carry
// ?ref=webcity.design, which is dropped; a few point at a page inside the site
// (osome.com/sg/, perplexity.ai/comet), which folds into its home page. Its /templates
// are Framer templates, not sites, and are not read. robots.txt allows everything.
// It keeps the normal quality bar.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://webcity.design";
const LISTING = `${BASE}/websites/`;
const BATCH = 50;

export const name = "webcity";

// Category slug → lib/taxonomy.js INDUSTRIES. Consulting and Technology are too
// broad to say, so they hint none.
const INDUSTRY = {
  "ai": "AI",
  "saas": "SaaS",
  "agency": "Agency & Portfolio",
  "portfolio": "Agency & Portfolio",
  "personal": "Agency & Portfolio",
  "e-commerce": "E-commerce",
  "fintech": "Finance",
  "architecture-interior": "Architecture & Interior",
  "healthcare": "Health",
  "education": "Education",
  "real-estate": "Real estate",
  "travel-hospitality": "Travel",
  "food-beverage": "Food & Drink",
  "fashion-beauty": "Fashion",
  "media-entertainment": "Media & Publishing",
  "nonprofit": "Nonprofit",
};

const OWN = /(^|\.)webcity\.design$/i;
// Links on every page that are not the site: the builder, the curator and his
// templates, the gallery's own social profiles.
const CHROME = /(^|\.)(framer\.(com|link|website)|framerusercontent\.com|shahrukh-qureshi\.com|linkedin\.com|x\.com|twitter\.com|instagram\.com|dribbble\.com|behance\.net)$/i;

// The /websites/ page or a category page to { sites, categories }: site page URLs
// (/websites/<slug>) and category page URLs (/websites/<category>/), in page order.
// Framer writes the links relative to the page.
export function links($, pageUrl) {
  const sites = [];
  const categories = [];
  $("a[href]").each((_, a) => {
    let u;
    try {
      u = new URL($(a).attr("href"), pageUrl);
    } catch {
      return;
    }
    if (!OWN.test(u.hostname)) return;
    const m = /^\/websites\/([^/]+)(\/?)$/.exec(u.pathname);
    if (!m) return;
    const href = `${BASE}${u.pathname}`;
    const list = m[2] ? categories : sites;
    if (!list.includes(href)) list.push(href);
  });
  return { sites, categories };
}

// A site page to { url, name }: the site's name is its heading, and the only link
// out that is not the gallery's own chrome is the site.
export function site($) {
  const url = $("a[href^='http'][target='_blank']")
    .map((_, a) => $(a).attr("href").trim())
    .get()
    .find((href) => {
      try {
        const u = new URL(href);
        return /^https?:$/.test(u.protocol) && !OWN.test(u.hostname) && !CHROME.test(u.hostname);
      } catch {
        return false;
      }
    });
  if (!url) return null;
  const u = new URL(url);
  if (/^webcity\.design$/i.test(u.searchParams.get("ref") ?? "")) u.searchParams.delete("ref");
  const heading = $("[data-framer-name='Name'] h1, [data-framer-name='Name'] h2").first().text() || $("h1").first().text();
  return { url: u.href, name: heading.replace(/\s+/g, " ").trim() || null };
}

export async function* listing({ limit }) {
  const index = links(cheerio.load(await fetchHtml(LISTING)), LISTING);
  if (!index.sites.length) {
    console.warn(`[${name}] no site pages on ${LISTING}; its markup may have changed`);
    return;
  }
  const industryOf = new Map();
  for (const cat of index.categories) {
    const slug = /\/websites\/([^/]+)\/$/.exec(new URL(cat).pathname)?.[1];
    const industry = INDUSTRY[slug];
    if (!industry) continue;
    try {
      for (const ref of links(cheerio.load(await fetchHtml(cat)), cat).sites) industryOf.set(ref, industry);
    } catch (err) {
      console.warn(`[${name}] skipped category ${cat}: ${err.message}`);
    }
  }
  const hosts = new Set();
  let yielded = 0;
  for (let i = 0; i < index.sites.length && yielded < limit; i += BATCH) {
    const batch = index.sites.slice(i, i + BATCH);
    const known = await knownSourceRefs(batch);
    for (const ref of batch) {
      if (yielded >= limit) return;
      if (known.has(ref)) continue;
      const entry = site(cheerio.load(await fetchHtml(ref)));
      if (!entry) continue;
      const host = new URL(entry.url).hostname.toLowerCase().replace(/^www\./, "");
      if (hosts.has(host)) continue;
      hosts.add(host);
      yielded++;
      yield { ...entry, industryHint: industryOf.get(ref) ?? null, sourceRef: ref };
    }
  }
}
