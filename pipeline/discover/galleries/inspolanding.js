// Inspolanding (inspolanding.design), a hand-picked gallery of about 450
// landing pages and sites (Attio, Polar, Aesop, Teenage Engineering, Pentagram,
// personal sites...). Its home page lists them newest first, 60 a page, paged
// with ?page=<n>; the cards render client-side, but each page's Next.js flight
// data carries the site records (slug, title, url, category and type slugs), so
// no page per site is fetched and each site's /?site=<slug> page is the source.
// A page past the last one repeats the last page, which ends the listing. The
// gallery's own section library (uiblockify.co) is blocklisted. The first
// category that maps to an industry wins, else agency and portfolio types are
// Agency & Portfolio. robots.txt allows everything but /admin, /account and /api.
import { paged } from "./paged.js";

const BASE = "https://inspolanding.design";

export const name = "inspolanding";

const INDUSTRY_BY_CATEGORY = {
  ai: "AI",
  architecture: "Architecture & Interior",
  interior: "Architecture & Interior",
  automotive: "Automotive",
  crypto: "Crypto",
  development: "Developer tools",
  education: "Education",
  entertainment: "Entertainment",
  gaming: "Entertainment",
  fashion: "Fashion",
  beauty: "Fashion",
  finance: "Finance",
  "food-drink": "Food & Drink",
  restaurant: "Food & Drink",
  health: "Health",
  media: "Media & Publishing",
  music: "Music",
  nonprofit: "Nonprofit",
  productivity: "Productivity",
  "real-estate": "Real estate",
  retail: "E-commerce",
  social: "Community & Social",
  travel: "Travel",
  hospitality: "Travel",
};
const PORTFOLIO_TYPES = new Set(["agency", "portfolio", "personal", "studio"]);

function industryOf(site) {
  for (const slug of site.category_slugs ?? []) {
    if (INDUSTRY_BY_CATEGORY[slug]) return INDUSTRY_BY_CATEGORY[slug];
  }
  return (site.type_slugs ?? []).some((t) => PORTFOLIO_TYPES.has(t)) ? "Agency & Portfolio" : null;
}

// The page's React Server Components payload: the string chunks pushed to
// self.__next_f, decoded and joined.
function flightData($) {
  return $("script").map((_, el) => {
    const m = /^self\.__next_f\.push\(\[1,("[\s\S]*")\]\)$/.exec($(el).text().trim());
    if (!m) return "";
    try {
      return JSON.parse(m[1]);
    } catch {
      return "";
    }
  }).get().join("");
}

// The JSON object that starts at `start` in `text`, or null.
function objectAt(text, start) {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

// Every site record in the flight data, once each.
function sites(text) {
  const seen = new Map();
  for (const m of text.matchAll(/\{"id":"[0-9a-f-]{36}","slug":"[^"]+","title":/g)) {
    const site = objectAt(text, m.index);
    if (site?.slug && typeof site.url === "string" && !seen.has(site.slug)) seen.set(site.slug, site);
  }
  return [...seen.values()];
}

export async function* listing({ limit }) {
  yield* paged({
    name,
    limit,
    maxPages: 50,
    pageUrl: (n) => (n > 1 ? `${BASE}/?page=${n}` : `${BASE}/`),
    parse: ($) => sites(flightData($))
      .filter((site) => /^https?:\/\//.test(site.url))
      .map((site) => ({
        url: site.url,
        name: site.title?.trim() || null,
        industryHint: industryOf(site),
        sourceRef: `${BASE}/?site=${encodeURIComponent(site.slug)}`,
      })),
  });
}
