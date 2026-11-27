// SANKOU! (sankoudesign.com), a curated Japanese web design reference gallery of
// about 3,200 sites: brand and campaign sites, studios, recruiting pages, shops
// and clinics (The North Face, Morisawa Fonts, Shibuya PARCO, Wantedly, KDDI...),
// with new sites added most days. The home page and /page/<n>/ list 81 cards each,
// newest first; every card links out to the site (the card's figure link and its
// name link) and to its detail post (/web/<slug>/, a few under other sections such
// as /cute/), the sourceRef. Cards under /contentpage/ are skipped: they point at a
// campaign page deep inside a shop's site (Felissimo, Lululun), not a site of its
// own. Cards carry no category (the category links on the page are the site's
// navigation), so the industry is left to the judge. robots.txt only disallows
// /wp-admin/.
import { paged } from "./paged.js";

const BASE = "https://sankoudesign.com";

export const name = "sankou";

export function parse($) {
  return $("li").has("a.detail-link[href]").map((_, el) => {
    const card = $(el);
    const detail = card.find("a.detail-link[href]").first().attr("href");
    if (!detail || detail.includes("/contentpage/")) return null;
    const link = card.find("[class^='site_more'] a[href^='http']").first();
    const url = link.attr("href") || card.find("figure a[target='_blank'][href^='http']").attr("href");
    if (!url) return null;
    let host;
    try {
      host = new URL(url).hostname;
    } catch {
      return null;
    }
    if (host.endsWith("sankoudesign.com")) return null;
    return {
      url,
      name: link.text().trim() || null,
      industryHint: null,
      sourceRef: new URL(detail, BASE).href,
    };
  }).get();
}

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 60,
    pageUrl: (n) => (n > 1 ? `${BASE}/page/${n}/` : `${BASE}/`),
    parse,
  });
}
