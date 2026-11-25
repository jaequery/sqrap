// Flat Inspire (flatinspire.com), a gallery of flat and minimal website design
// filed by category, style, typeface and color: Stumptown Coffee, Away,
// Thursday Boots, Withings, Allbirds, Heap, Simple. Its home page lists the
// sites newest first, 12 a page, paged with /page/<n>/; each card's image
// links straight out to the site and its title to a detail page, which is the
// sourceRef, so no page per site is fetched. The gallery stopped adding sites
// in 2018 and reaches back to 2013 (about 40 pages); the adapter stops at page
// 20 (early 2014), since older sites are more often gone or redesigned. The
// card's category maps to industry (Services mixes software with print shops
// and studios, so it carries no hint); mobile-app landing pages, infographics and
// resource lists are skipped.
import { paged } from "./paged.js";

const BASE = "https://flatinspire.com";

export const name = "flatinspire";

// website-category-<slug> class → lib/taxonomy.js INDUSTRIES; others carry no hint.
const INDUSTRY = {
  "e-commerce": "E-commerce",
  products: "E-commerce",
  "e-learning": "Education",
  food: "Food & Drink",
  healthcare: "Health",
  travel: "Travel",
  cause: "Nonprofit",
  "design-agencies": "Agency & Portfolio",
  portfolios: "Agency & Portfolio",
  personal: "Agency & Portfolio",
  production: "Agency & Portfolio",
  software: "SaaS",
  "web-apps": "SaaS",
};
const SKIP = new Set(["mobile-apps", "infographics", "resources"]);

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 20,
    pageUrl: (n) => `${BASE}/${n > 1 ? `page/${n}/` : ""}`,
    parse: ($) =>
      $("#content article.gallery-item").map((_, el) => {
        const card = $(el);
        const url = card.find("a.entry-image[href^='http']").attr("href");
        const title = card.find(".entry-title a[href]").first();
        const categories = (card.attr("class") ?? "")
          .split(/\s+/)
          .filter((c) => c.startsWith("website-category-"))
          .map((c) => c.slice("website-category-".length));
        if (!url || categories.some((c) => SKIP.has(c))) return null;
        let host;
        try {
          host = new URL(url).hostname;
        } catch {
          return null;
        }
        if (/(^|\.)flatinspire\.com$/i.test(host)) return null;
        return {
          url,
          name: title.text().trim() || null,
          industryHint: categories.map((c) => INDUSTRY[c]).find(Boolean) ?? null,
          sourceRef: title.attr("href") ? new URL(title.attr("href"), BASE).href : null,
        };
      }).get(),
  });
}
