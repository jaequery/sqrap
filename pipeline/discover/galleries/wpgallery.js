// WP Gallery (wp.gallery), a hand-picked gallery of well-designed WordPress
// sites: brands, publishers, universities and studios (TransferGo, Tim Ferriss,
// St. Louis Magazine, Wonde...). The home page lists them newest first, paged
// with ?query-1-page=<n>, 23 cards a page (about 180 sites in all). Each card
// links straight out to the site (with ?ref=wp.gallery, which normalizing
// drops) beside its detail page, which becomes the sourceRef, so no page per
// site is fetched. The card's website_category-* classes are mapped to an
// industry.
import { industryFromTags } from "../industry.js";
import { paged } from "./paged.js";

const BASE = "https://wp.gallery";

export const name = "wpgallery";

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 50,
    pageUrl: (n) => `${BASE}/${n > 1 ? `?query-1-page=${n}` : ""}`,
    parse: ($) =>
      $("li.wp-block-post.type-website").map((_, el) => {
        const card = $(el);
        const url = card.find(".external-icon-link a[href^='http']").first().attr("href");
        const detail = card.find(".wp-block-post-title a").first();
        if (!url || !detail.attr("href")) return null;
        const categories = (card.attr("class") || "").split(/\s+/)
          .filter((c) => c.startsWith("website_category-"))
          .map((c) => c.replace(/^website_category-(wordpress-)?/, "").replace(/-/g, " "));
        return {
          url,
          name: detail.text().trim() || null,
          industryHint: industryFromTags(categories),
          sourceRef: new URL(detail.attr("href"), BASE).href,
        };
      }).get(),
  });
}
