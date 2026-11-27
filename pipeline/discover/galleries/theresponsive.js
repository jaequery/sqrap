// The Responsive (the-responsive.com), "a gallery showcasing the finest responsive
// design": about 1,280 hand-picked websites, each shown as a desktop and a mobile
// screenshot (studios and portfolios, fashion and furniture stores, architects,
// galleries, editorial and culture sites: Base Design, Framework Berlin, Shang Xia,
// Amie...). The home page lists them newest first, paged with /page/<n>/, 12 a
// page, about 107 pages back to 2014; the last entries were added in August 2024.
// Every card links straight out to the site from its screenshots, so no page per
// site is fetched; the card's category classes (Architecture, Culinary, Fashion,
// Portfolio, Store, Technology...) hint the industry. Each entry's own page is the
// sourceRef. robots.txt only disallows /wp-admin/.
import { paged } from "./paged.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://the-responsive.com";
const OWN = /^https?:\/\/([^/]+\.)?the-responsive\.com\b/i;

export const name = "theresponsive";

// A category slug the shared keyword map does not know, renamed to one it does.
const ALIASES = { culinary: "food" };

export function parse($, pageUrl) {
  return $("article[id^='post-']").map((_, el) => {
    const card = $(el);
    const url = card.find(".desktop-screen a[href^='http'], .mobile-screen a[href^='http']").first().attr("href")?.trim();
    if (!url || OWN.test(url)) return null;
    const title = card.find(".entry-title a").first();
    const categories = (card.attr("class") || "")
      .split(/\s+/)
      .filter((c) => c.startsWith("category-") && c !== "category-responsive")
      .map((c) => c.slice("category-".length))
      .map((c) => ALIASES[c] ?? c.replace(/-/g, " "));
    return {
      url,
      name: title.text().trim() || null,
      industryHint: industryFromTags(categories),
      sourceRef: title.attr("href")?.trim() || pageUrl,
    };
  }).get().filter(Boolean);
}

export function listing({ limit }) {
  return paged({
    name,
    limit,
    // The archive ends at page 107 and gets no new pages; page 108 answers 404.
    maxPages: 107,
    pageUrl: (n) => `${BASE}/${n > 1 ? `page/${n}/` : ""}`,
    parse,
  });
}
