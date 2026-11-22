// 1GUU (1guu.jp), a long-running Japanese gallery of web design from Japan and
// abroad, filed by country. Its home page lists the sites newest first, paged
// with /page/<n>/, 20 a page; every card links straight out to the site, so no
// page per site is fetched. The listing reaches back to about 2018; the adapter
// stops at page 100 (mid-2020), since older sites have often been redesigned
// or gone. The operator's own studio card (#item_free) is skipped, and names
// the card cut short with an ellipsis are left for capture to fill in.
import { paged } from "./paged.js";

const BASE = "https://1guu.jp";

export const name = "1guu";

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 100,
    pageUrl: (n) => `${BASE}/${n > 1 ? `page/${n}/` : ""}`,
    parse: ($, pageUrl) =>
      $("#works .item:not(#item_free) > a[href^='http']").map((_, el) => {
        const card = $(el);
        const title = card.find("h3.pc").first().text().trim();
        return {
          url: card.attr("href"),
          name: title && !title.endsWith("…") ? title : null,
          sourceRef: pageUrl,
        };
      }).get(),
  });
}
