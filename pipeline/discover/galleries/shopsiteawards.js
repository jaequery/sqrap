// Shop Site Awards (shopsiteawards.com), a curated archive of design-led online
// stores (Flamingo Estate, Ganni, Italic, Tower 28, Sunday Paris...), about 160
// so far. Its home page lists them newest first, paged with /page/<n>/, 24 a
// page; each card links straight out to the store beside its /website/<slug>/
// detail page, which becomes the sourceRef, so no page per site is fetched.
// Cards carry no category, so every store is E-commerce.
import { paged } from "./paged.js";

const BASE = "https://shopsiteawards.com";

export const name = "shopsiteawards";

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 50,
    pageUrl: (n) => `${BASE}/${n > 1 ? `page/${n}/` : ""}`,
    parse: ($) =>
      $("article.site-card").map((_, el) => {
        const card = $(el);
        const url = card.find("a.site-card-external[href^='http']").first().attr("href");
        const title = card.find("a.site-card-title[href*='/website/']").first();
        if (!url || !title.attr("href")) return null;
        return {
          url,
          name: title.text().replace(/★/g, "").trim() || null,
          industryHint: "E-commerce",
          sourceRef: new URL(title.attr("href"), `${BASE}/`).href,
        };
      }).get(),
  });
}
