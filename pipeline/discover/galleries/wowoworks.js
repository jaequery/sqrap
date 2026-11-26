// Wow! Works (wowoworks.com), a hand-picked Japanese web design gallery of about
// 520 sites, mostly Japanese corporate, brand, shop, recruiting and portfolio
// sites with some from abroad, added from 2018 to February 2022 (nothing newer
// as of November 2026). Its home page lists the sites newest first, paged with
// /page/<n>/, 12 a page (about 44 pages); every card links straight out to the
// site, so no page per site is fetched and the listing page is the sourceRef.
// Recruiting sites (採用, リクルート) are skipped, as they are mostly careers
// subpages of corporate sites. A page past the last one is a 404, which ends
// the listing. robots.txt disallows nothing.
import { paged } from "./paged.js";

const BASE = "https://wowoworks.com";

export const name = "wowoworks";

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
    maxPages: 60,
    pageUrl: (n) => `${BASE}/${n > 1 ? `page/${n}/` : ""}`,
    parse: ($, pageUrl) =>
      $("main article.post > a[href^='http']")
        .map((_, el) => {
          const card = $(el);
          const url = card.attr("href");
          const title = card.find(".post__title").first().text().trim();
          if (/^https?:\/\/(www\.)?wowoworks\.com\b/i.test(url) || /採用|リクルート|recruit/i.test(title)) return null;
          return { url, name: title || null, sourceRef: pageUrl };
        })
        .get(),
  });
}
