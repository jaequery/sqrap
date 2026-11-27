// Parts. (partsdesign.net), a Japanese gallery of website sections (main visuals,
// headers, footers, pricing, FAQs, forms, numbers...) cut from about 470 real
// sites and kept by the Tokyo studio Glatch, new sites added every week or two.
// Most are Japanese B2B SaaS and product sites (SmartHR, KARTE, microCMS, Money
// Forward Cloud, Cybozu Office, ovice, Goodpatch) with some corporate brand sites
// (Nobel, Kadoya, OKI) and a few global products' Japanese pages (Notion, Todoist,
// Sentry, Kinsta). It was once passed over as mostly corporate and small local
// business sites; a read of every card shows few small local businesses.
// The home page and /page/<n> list 15 cards each, one per site, newest first; each
// card links straight to the site (a.c-entry__url, named by p.c-modal__title) and to
// the site's parts page (/archives/<id>), the sourceRef. Recruiting sites (採用) are
// skipped, and so is Glatch's own site. Cards carry no category, so the industry is
// left to the judge. The WordPress REST API answers 403 and the sitemap is empty, but
// robots.txt only disallows /wp-admin/.
import { paged } from "./paged.js";

const BASE = "https://partsdesign.net";

export const name = "partsdesign";

const RECRUITING = /採用|リクルート|recruit|careers?\b/i;

export function parse($) {
  return $("li.c-card__item").map((_, el) => {
    const card = $(el);
    const link = card.find("a.c-entry__url[href]").first();
    const url = link.attr("href")?.trim();
    const detail = card.find("a[href*='/archives/']").first().attr("href");
    if (!url || !detail) return null;
    let site;
    try {
      site = new URL(url);
    } catch {
      return null;
    }
    if (!/^https?:$/.test(site.protocol) || /(^|\.)(partsdesign\.net|glatchdesign\.com)$/i.test(site.hostname)) return null;
    const title = card.find("p.c-modal__title").first().text().replace(/\s+/g, " ").trim();
    if (RECRUITING.test(title) || RECRUITING.test(site.hostname + site.pathname)) return null;
    return {
      url: site.href,
      name: title || null,
      industryHint: null,
      countryHint: site.hostname.endsWith(".jp") ? "JP" : null,
      sourceRef: new URL(detail, BASE).href,
    };
  }).get();
}

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 60,
    pageUrl: (n) => (n > 1 ? `${BASE}/page/${n}` : `${BASE}/`),
    parse,
  });
}
