// Choooodoii (choooodoii.com), a Japanese gallery of corporate, shop, product
// and service sites picked for "just right" design, running since 2022. Its
// home page lists the sites newest first, paged with /page/<n>/, about 70 a
// page (about 26 pages); each card links straight out to the site beside its
// /gallery/<id>/ detail page, which becomes the sourceRef, so no page per site
// is fetched. Cards carry industry-<slug> and site_type-<slug> classes: the
// industry slug is mapped to an industry, recruiting pages are skipped, and the
// gallery's ad cards (no category-gallery class) are ignored.
import { paged } from "./paged.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://choooodoii.com";

export const name = "choooodoii";

// "product" there means a maker's product site, not a shop; "others" is no hint.
const INDUSTRY_SKIP = new Set(["product", "others"]);

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 40,
    pageUrl: (n) => `${BASE}/${n > 1 ? `page/${n}/` : ""}`,
    parse: ($) =>
      $(".grid_item.category-gallery").map((_, el) => {
        const card = $(el);
        const classes = (card.attr("class") || "").split(/\s+/);
        if (classes.includes("site_type-recruitment")) return null;
        const url = card.find("a.link_site[href^='http']").first().attr("href");
        const detail = card.find("a.link_point[href*='/gallery/']").first().attr("href");
        if (!url || !detail) return null;
        const industries = classes.filter((c) => c.startsWith("industry-")).map((c) => c.slice(9))
          .filter((s) => !INDUSTRY_SKIP.has(s)).map((s) => s.replace(/-/g, " "));
        return {
          url,
          name: card.find(".thum img").first().attr("alt")?.trim() || null,
          industryHint: industryFromTags(industries),
          sourceRef: new URL(detail, `${BASE}/`).href,
        };
      }).get(),
  });
}
