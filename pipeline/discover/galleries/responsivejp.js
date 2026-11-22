// Responsive Web Design JP (responsive-jp.com), a curated Japanese gallery of
// responsive sites: corporate, recruiting, shop, school and brand sites, mostly
// from Japan. Each /page/<n> lists 20 sites newest first, about 220 pages deep;
// every card's title links straight out to the site and to its /<id>.html
// detail page.
import { paged } from "./paged.js";

const BASE = "https://responsive-jp.com";

export const name = "responsivejp";

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 300,
    pageUrl: (n) => (n > 1 ? `${BASE}/page/${n}` : `${BASE}/`),
    parse: ($) =>
      $("section.indexSection").map((_, el) => {
        const card = $(el);
        const link = card.find(".title h2 a[href^='http']");
        const url = link.attr("href");
        const detail = card.find(".title .permalink a[href]").attr("href");
        if (!url || !detail) return null;
        return {
          url,
          name: link.text().trim() || null,
          sourceRef: new URL(detail, BASE).href,
        };
      }).get(),
  });
}
