// I/O 3000 (io3000.com), a curated Japanese web design gallery: corporate,
// recruiting, studio and brand sites, mostly from Japan, a dozen a day. Each
// /page/<n>/ lists 12 sites newest first, about 200 pages deep; every card links
// straight out to the site and to its /bm/<slug>/ detail page.
import { paged } from "./paged.js";

const BASE = "https://io3000.com";

export const name = "io3000";

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 250,
    pageUrl: (n) => `${BASE}/${n > 1 ? `page/${n}/` : ""}`,
    parse: ($) =>
      $("li.list-index__item").map((_, el) => {
        const card = $(el);
        const url = card.find("a.list-index__target[href^='http']").attr("href");
        const detail = card.find("a.list-index__detail-target[href]").attr("href");
        if (!url || !detail) return null;
        return {
          url,
          name: card.find(".list-index__title").text().trim() || null,
          sourceRef: new URL(detail, BASE).href,
        };
      }).get(),
  });
}
