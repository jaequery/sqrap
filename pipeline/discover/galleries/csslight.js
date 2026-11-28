// CSS Light (csslight.com). Its featured-sites list pages by offset
// (?per_page=0, 12, 24, …), newest first; every card links to its
// /website/<id>/<slug> page and out to the site. The "by" link under each card
// is the designer's own site, not the featured one. The list runs back to
// November 2012, about 5,100 sites in some 425 pages (page 100 is only August
// 2023); a page past the end has no cards, which ends the listing, and runs
// resume at the page an earlier one reached (paged()). robots.txt allows it.
import { paged } from "./paged.js";

const BASE = "https://www.csslight.com";
const PER_PAGE = 12;

export const name = "csslight";

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 450,
    pageUrl: (n) => `${BASE}/featured-sites${n > 1 ? `?&per_page=${(n - 1) * PER_PAGE}` : ""}`,
    parse: ($) =>
      $("li:has(> .img a.go)").map((_, el) => {
        const card = $(el);
        const url = card.find(".img a.go[href^='http']").attr("href");
        const detail = card.find(".dec h2 a[href*='/website/']").first();
        if (!url || !detail.length) return null;
        return { url, name: detail.text().trim() || null, sourceRef: new URL(detail.attr("href"), BASE).href };
      }).get(),
  });
}
