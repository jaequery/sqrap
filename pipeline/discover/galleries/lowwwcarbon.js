// lowwwcarbon (lowwwcarbon.com), a reviewed showcase of about 290 low-carbon
// websites run by Nick Lewis since 2021, each graded by page weight and the CO2
// one visit emits: studios, portfolios, nonprofits and product sites (Root &
// Branch, YeahNah, HYPER scales...), updated through November 2026. Its
// /showcase/page/<n>/ listing shows 16 tiles a page newest first, about 19
// pages deep (page 1 is /showcase/); every tile links straight out to the
// site, so no page per site is fetched and the listing page is the source. A
// page past the last one is empty, which ends the listing. Tiles carry no
// industry. robots.txt allows everything (it shuts out only AI training bots).
import { paged } from "./paged.js";

const BASE = "https://lowwwcarbon.com";

export const name = "lowwwcarbon";

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 60,
    pageUrl: (n) => (n > 1 ? `${BASE}/showcase/page/${n}/` : `${BASE}/showcase/`),
    parse: ($, pageUrl) =>
      $("article.tile").map((_, el) => {
        const link = $(el).find("h2 a[href^='http']").first();
        const url = link.attr("href");
        if (!url) return null;
        return { url, name: link.text().trim() || null, sourceRef: pageUrl };
      }).get(),
  });
}
