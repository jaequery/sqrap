// Ikesai (ikesai.com), a long-running Japanese web design database: corporate,
// recruiting, school, shop and promotion sites from Japan, two to four added a
// day. The home page lists 50 sites per ?p=<n> newest first, about 90 pages
// deep (pages past the end repeat the last one); every card links straight out
// to the site and there is no detail page.
import { paged } from "./paged.js";

const BASE = "https://www.ikesai.com";

export const name = "ikesai";

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 150,
    pageUrl: (n) => (n > 1 ? `${BASE}/?p=${n}` : `${BASE}/`),
    parse: ($, pageUrl) =>
      $("ul.siteThumb > li > a[href^='http']").map((_, el) => {
        const link = $(el);
        return {
          url: link.attr("href"),
          name: link.find("strong").text().trim() || link.find("img").attr("alt")?.trim() || null,
          sourceRef: pageUrl,
        };
      }).get(),
  });
}
