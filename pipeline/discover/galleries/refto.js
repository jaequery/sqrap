// Refto (refto.one), a hand-picked library of website design references that adds
// a few dozen sites a week: AI, SaaS and developer-tool products (Modal, Hex, Flighty,
// Craft, Twenty), fintech, studios and portfolios, shops and brands. Its sitemap lists
// every site page as a single-segment refto.one/<slug> URL with a lastmod, roughly
// newest first, next to its tool, style and category pages; each site page's header
// links out to the site with ?ref=refto.one and tags it with categories
// (/categories/<name>). Pages without that outbound link (SEO and legal pages) are
// skipped, as are entries tagged plugin or template. robots.txt allows every public
// page. Pages already stored as a site's sourceRef are not fetched again.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://refto.one";
const BATCH = 50;

export const name = "refto";

// Its categories, mapped to an industry; the rest (design, web_app, product, motion,
// marketing...) say nothing about the industry. A page's tags are matched in this
// order, not the page's, so a developer's portfolio tagged development and portfolio
// stays a portfolio.
const INDUSTRY = {
  agency: "Agency & Portfolio",
  portfolio: "Agency & Portfolio",
  personal: "Agency & Portfolio",
  photography: "Agency & Portfolio",
  ai: "AI",
  development: "Developer tools",
  crypto: "Crypto",
  web3: "Crypto",
  nft: "Crypto",
  finance: "Finance",
  saas: "SaaS",
  technology: "SaaS",
  security: "SaaS",
  hr: "SaaS",
  legal: "SaaS",
  health: "Health",
  medicine: "Health",
  education: "Education",
  fashion: "Fashion",
  e_commerce: "E-commerce",
  food_drink: "Food & Drink",
  restaurant: "Food & Drink",
  travel: "Travel",
  hospitality: "Travel",
  real_estate: "Real estate",
  architecture: "Architecture & Interior",
  furniture: "Architecture & Interior",
  news: "Media & Publishing",
  podcast: "Media & Publishing",
  literature: "Media & Publishing",
  music: "Music",
  gaming: "Entertainment",
  event: "Entertainment",
  automotive: "Automotive",
  communication: "Productivity",
  desktop_app: "Productivity",
  mobile_app: "Productivity",
  community: "Community & Social",
};
const SKIP = new Set(["plugin", "template"]);

// The site pages in the sitemap: single-segment URLs that carry a lastmod.
export function sitePages(xml) {
  const $ = cheerio.load(xml, { xml: true });
  return $("url").map((_, el) => {
    const loc = $(el).find("loc").text().trim();
    if (!$(el).find("lastmod").text().trim()) return null;
    return /^https:\/\/refto\.one\/[a-z0-9][a-z0-9-]*$/.test(loc) ? loc : null;
  }).get().filter(Boolean);
}

export function parsePage($) {
  const href = $("a[href^='http'][href*='ref=refto.one']").first().attr("href");
  if (!href) return null;
  const categories = [...new Set($("a[href^='/categories/']").map((_, a) => $(a).attr("href").slice("/categories/".length)).get())];
  if (categories.some((c) => SKIP.has(c))) return null;
  const url = new URL(href);
  url.searchParams.delete("ref");
  return {
    url: url.href,
    name: $("h1").first().text().trim() || null,
    industryHint: INDUSTRY[Object.keys(INDUSTRY).find((c) => categories.includes(c))] ?? null,
  };
}

export async function* listing({ limit }) {
  const refs = sitePages(await fetchHtml(`${BASE}/sitemap.xml`));
  if (!refs.length) {
    console.warn(`[${name}] no site pages in the sitemap; its format may have changed`);
    return;
  }
  let yielded = 0;
  for (let i = 0; i < refs.length && yielded < limit; i += BATCH) {
    const batch = refs.slice(i, i + BATCH);
    const known = await knownSourceRefs(batch);
    for (const ref of batch) {
      if (yielded >= limit) return;
      if (known.has(ref)) continue;
      const entry = parsePage(cheerio.load(await fetchHtml(ref)));
      if (!entry) continue;
      yielded++;
      yield { ...entry, sourceRef: ref };
    }
  }
}
