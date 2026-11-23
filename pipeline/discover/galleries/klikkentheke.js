// Klikkentheke (klikkentheke.com), a hand-picked catalogue of about 1,500
// studio, portfolio, shop and cultural sites (Oblik, Isaac Powell, Blond...).
// The catalogue is paged with /catalogue/page/<n>/ newest first, 12 cards a
// page; each card links straight out to the site beside its /catalogue/<slug>/
// detail page, which becomes the sourceRef, so no page per site is fetched.
import { paged } from "./paged.js";

const BASE = "https://klikkentheke.com";

export const name = "klikkentheke";

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 200,
    pageUrl: (n) => `${BASE}/catalogue/${n > 1 ? `page/${n}/` : ""}`,
    parse: ($) =>
      $("div.thumb").map((_, el) => {
        const card = $(el);
        const link = card.find("a.title[href^='http']").first();
        const detail = card.find("a.zoom[href*='/catalogue/']").first().attr("href");
        if (!link.attr("href") || !detail) return null;
        return {
          url: link.attr("href"),
          name: link.text().trim() || null,
          sourceRef: new URL(detail, `${BASE}/`).href,
        };
      }).get(),
  });
}
