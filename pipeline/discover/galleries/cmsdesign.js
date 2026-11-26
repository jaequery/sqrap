// cms design (cmsdesign.jp), a Japanese web design gallery of sites built on a
// CMS, mostly WordPress with some Shopify, STUDIO, microCMS and a-blog cms:
// corporate, brand, clinic, shop, restaurant and studio sites, about 2,100 of
// them added from May 2019 to April 2026. Its home page lists them newest
// first, paged with /page/<n>/, 24 a page (about 88 pages); every card links
// straight out to the site and to its /cms/<cms>/<id>/ detail page, which is
// kept as the sourceRef. Recruiting pages (採用, リクルート, /recruit/) are
// skipped, as they are careers subpages of corporate sites. A page past the
// last one is a 404, which ends the listing. robots.txt disallows only
// /wp-admin/.
import { paged } from "./paged.js";

const BASE = "https://cmsdesign.jp";

export const name = "cmsdesign";

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
    maxPages: 120,
    pageUrl: (n) => `${BASE}/${n > 1 ? `page/${n}/` : ""}`,
    parse: ($, pageUrl) =>
      $("div.list")
        .map((_, el) => {
          const card = $(el);
          const url = card.children("a[href^='http']").first().attr("href");
          const detail = card.find(".link-area a[href*='/cms/']").first().attr("href");
          const title = card.find("figcaption").first().text().trim();
          if (!url || /^https?:\/\/(www\.)?cmsdesign\.jp\b/i.test(url)) return null;
          if (/採用|リクルート|recruit/i.test(title) || /\/(recruit|careers?)\b/i.test(url)) return null;
          return { url, name: title || null, sourceRef: detail ? new URL(detail, BASE).href : pageUrl };
        })
        .get(),
  });
}
