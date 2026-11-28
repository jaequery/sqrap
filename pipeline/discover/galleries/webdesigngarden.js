// Web Design Garden (webdesigngarden.com), a Japanese web design gallery
// ("優れたWebデザインを集めたギャラリーサイト") updated every morning since October 2020: about 1,500
// entries over some 1,420 hosts (about 1,030 kept), mostly Japanese corporate,
// brand, studio, school, shop and service sites (Goodpatch, TBWA\HAKUHODO, SB Sankyo
// Foods), still added daily in November 2026. Its home page lists them newest first,
// paged with /page/<n>/, 100 a page (16 pages); every card links straight out to the
// site, so no page per site is fetched and the listing page is kept as the
// sourceRef. The cards carry no category (industry lives only on category listing
// pages), so no industry is hinted; it picks sites from abroad too (Brooklyn Museum,
// DoKomi), so only .jp hosts are tagged Japan. Recruiting pages (採用, リクルート,
// /recruit/) are skipped, and so are campaign, anniversary and product pages deep
// inside a brand's site (felissimo.co.jp/contents/...), which would otherwise fold
// into that brand's home page; language roots (/ja/, /en/) are kept. A page past the
// last one is a 404, which ends the listing. Its WordPress REST API answers 403;
// robots.txt disallows only /wp-admin/.
import { paged } from "./paged.js";

const BASE = "https://webdesigngarden.com";

export const name = "webdesigngarden";

const RECRUITING = /採用|リクルート|recruit|saiyou?\b|careers?\b|jobs?\b/i;
// A path that is the site itself: the root, an index file or a language root.
const SITE_ROOT = /^\/((ja|jp|en|ja-jp|en-us|en-gb)\/?)?(index\.(html?|php))?$/i;

export function parse($, pageUrl) {
  return $("li.p-postList__item > a.p-postList__link")
    .map((_, el) => {
      const card = $(el);
      let site;
      try {
        site = new URL(card.attr("href")?.trim() ?? "");
      } catch {
        return null;
      }
      site.hash = "";
      if (!/^https?:$/.test(site.protocol) || /(^|\.)webdesigngarden\.com$/i.test(site.hostname)) return null;
      const title = card.find(".p-postList__title").first().text().replace(/\s+/g, " ").trim();
      if (RECRUITING.test(title) || RECRUITING.test(site.hostname + site.pathname)) return null;
      if (!SITE_ROOT.test(site.pathname)) return null;
      const countryHint = /\.jp$/i.test(site.hostname) ? "JP" : null;
      return { url: site.href, name: title || null, countryHint, sourceRef: pageUrl };
    })
    .get()
    .filter(Boolean);
}

export async function* listing({ limit }) {
  try {
    yield* paged({
      name,
      limit,
      maxPages: 40,
      pageUrl: (n) => `${BASE}/${n > 1 ? `page/${n}/` : ""}`,
      parse,
    });
  } catch (err) {
    if (!/^HTTP 404 for .*\/page\/\d+\/$/.test(err.message)) throw err;
  }
}
