// 1GUU (1guu.jp), a long-running Japanese gallery of web design from Japan and
// abroad, filed by country. Its home page lists the sites newest first, paged
// with /page/<n>/, 20 a page; every card links straight out to the site, so no
// page per site is fetched. The listing reaches back to its first picks of
// 2018, page 329 today; the page past the last is a 404, which ends the
// listing. The operator's own studio card (#item_free) is skipped, and names
// the card cut short with an ellipsis are left for capture to fill in.
// robots.txt disallows only /wp-admin/.
import { paged } from "./paged.js";

const BASE = "https://1guu.jp";

export const name = "1guu";

export async function* listing({ limit }) {
  try {
    yield* pages(limit);
  } catch (err) {
    if (!/^HTTP 404 for .*\/page\/\d+\/$/.test(err.message)) throw err;
  }
}

function pages(limit) {
  return paged({
    name,
    limit,
    maxPages: 360,
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
