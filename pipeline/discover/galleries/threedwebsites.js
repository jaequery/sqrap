// 3D Websites (3dwebsites.design), a hand-picked gallery of sites built around
// WebGL and 3D (Deeo Studio, Festina, Artemii Lebedev...). The home page lists
// them newest first, paged with ?page=<n>, 17 cards a page (about 45 sites).
// Each card links straight out to the site with ?ref=3dwebsites.design (which
// normalizing drops) beside its /website/<slug> detail page, which becomes the
// sourceRef, so no page per site is fetched.
import { paged } from "./paged.js";

const BASE = "https://3dwebsites.design";

export const name = "3dwebsites";

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 30,
    pageUrl: (n) => `${BASE}/${n > 1 ? `?page=${n}` : ""}`,
    parse: ($) =>
      $("div.group").map((_, el) => {
        const card = $(el);
        const url = card.find("a[href^='http'][href*='ref=3dwebsites.design']").first().attr("href");
        const detail = card.find("a[href*='website/']").first();
        if (!url || !detail.attr("href")) return null;
        return {
          url,
          name: card.find("h3").first().text().trim() || null,
          sourceRef: new URL(detail.attr("href"), `${BASE}/`).href,
        };
      }).get(),
  });
}
