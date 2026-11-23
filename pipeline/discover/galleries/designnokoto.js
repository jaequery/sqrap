// デザインのこと (designnokoto.com), a Japanese web design gallery updated
// several times a week since 2019, tagged by tone and color: shops, cafes,
// films, studios, brands and campaign sites (spicato 10th, AFURI BREWING,
// THE BUTTER...). /_____wd_/page/<n> lists its PC designs, 36 a page newest
// first, about 55 pages deep; every live card links straight out to the site
// (cards of closed sites, 掲載終了, link only to the post and are skipped), and
// its "quick look" modal carries the post id, so /wd/<id> is kept as the
// source and no page per site is fetched. Sponsored-link cards and recruiting
// sites (採用) are skipped. Cards carry no industry. A page past the last one is
// empty. robots.txt disallows only /wp-admin/.
import { paged } from "./paged.js";

const BASE = "https://designnokoto.com";

export const name = "designnokoto";

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 150,
    pageUrl: (n) => (n > 1 ? `${BASE}/_____wd_/page/${n}` : `${BASE}/_____wd_`),
    parse: ($) =>
      $(".thumbnail-textBox").map((_, el) => {
        const card = $(el);
        const link = card.find("li.title a[href^='http']:not([href^='https://designnokoto.com'])").first();
        const id = card.find("[data-remodal-target$='details']").attr("data-remodal-target")?.match(/^(\d+)details$/)?.[1];
        const title = link.text().trim();
        if (!link.attr("href") || !id || /採用/.test(title)) return null;
        return {
          url: link.attr("href"),
          name: title || null,
          industryHint: null,
          sourceRef: `${BASE}/wd/${id}`,
        };
      }).get(),
  });
}
