// OG Image Gallery (ogimage.gallery), a hand-picked gallery of about 900 sites
// shown by their social share images (Bruno Simon, darkroom.engineering,
// Cognition, Stripe's BFCM page...). Its Webflow home page lists them newest
// first, 100 a page, paged with ?55263efb_page=<n>; every card links straight
// out to the site, and its /og-images/<slug> page is kept as the source, so no
// page per site is fetched. Webflow answers a page past the last one with page
// 1, so a page without a link back to the one before it ends the listing.
// Entries carry no industry. robots.txt allows everything.
import { paged } from "./paged.js";

const BASE = "https://www.ogimage.gallery";
const PAGE_PARAM = "55263efb_page";

export const name = "ogimagegallery";

export async function* listing({ limit }) {
  yield* paged({
    name,
    limit,
    maxPages: 30,
    pageUrl: (n) => (n > 1 ? `${BASE}/?${PAGE_PARAM}=${n}` : `${BASE}/`),
    parse: ($, pageUrl) => {
      const n = Number(new URL(pageUrl).searchParams.get(PAGE_PARAM) ?? 1);
      if (n > 1 && !$(`a[href*='${PAGE_PARAM}=${n - 1}']`).length) return [];
      return $(".collection-item").map((_, el) => {
        const card = $(el);
        const url = card.find("a.external-url[href^='http']").first().attr("href");
        if (!url) return null;
        const detail = card.find("a[href^='/og-images/']").first().attr("href");
        return {
          url,
          name: card.find(".source").first().text().trim() || null,
          sourceRef: detail ? `${BASE}${detail}` : pageUrl,
        };
      }).get();
    },
  });
}
