// Good Web Design (good-web-design.com), a Japanese web design gallery updated
// several times a week since 2020: brand, hotel, product, studio and campaign
// sites (SHIJIMA ATAMI, KOKUYO We-Being, Orgnzm Studio...), mostly from Japan.
// /webdesign/page/<n> lists 24 sites newest first, about 400 pages deep; every
// card links straight out to the site and to its /webdesign/<slug> page. Cards
// carry no category, so there is no industry hint. Recruiting sites (採用) are
// skipped, as they are mostly careers subpages of corporate sites. A page past
// the last one is empty. robots.txt disallows only /wp/wp-admin/.
import { paged } from "./paged.js";

const BASE = "https://good-web-design.com";

export const name = "goodwebdesign";

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 600,
    pageUrl: (n) => `${BASE}/webdesign${n > 1 ? `/page/${n}` : ""}`,
    parse: ($) =>
      $(".index-kaku").map((_, el) => {
        const card = $(el);
        const site = card.find("#index-entry-ti a[href^='http']").first();
        const detail = card.find(".index-thumb a[href*='/webdesign/']").attr("href");
        const title = site.text().trim();
        if (!site.attr("href") || !detail || /採用/.test(title)) return null;
        return {
          url: site.attr("href"),
          name: title || null,
          industryHint: null,
          sourceRef: new URL(detail, BASE).href,
        };
      }).get(),
  });
}
