// Top CSS Gallery (topcssgallery.com), a web design award gallery running since
// 2009. Its Site of the Day archive (/site-of-the-day/page/<n>/) lists about
// 2,000 winners newest first, 11 a page (studios, portfolios, hotels, brands:
// Adoratorio, Toyfight, Jesper Landberg...). Every card links straight out to
// the site and to its /gallery/<slug>/ page, and carries a category mapped to
// industry. Template entries are skipped. A page past the last one is empty.
// robots.txt allows everything but /wp-admin, /dev and /newsletter.
import { paged } from "./paged.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://www.topcssgallery.com";

export const name = "topcssgallery";

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 250,
    pageUrl: (n) => `${BASE}/site-of-the-day/${n > 1 ? `page/${n}/` : ""}`,
    parse: ($) =>
      $(".site-list-items .list-item-box").map((_, el) => {
        const card = $(el);
        const url = card.find("a.visit-gallery-site[href^='http']").attr("href");
        const detail = card.find("h4 a[href*='/gallery/']").first();
        const title = detail.text().trim();
        if (!url || !detail.attr("href") || /\btemplate\b/i.test(title)) return null;
        return {
          url,
          name: title || null,
          industryHint: industryFromTags(card.find(".site-cat a").map((_, a) => $(a).text()).get()),
          sourceRef: new URL(detail.attr("href"), BASE).href,
        };
      }).get(),
  });
}
