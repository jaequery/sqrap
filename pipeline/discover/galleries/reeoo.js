// Reeoo (reeoo.com), a website and app design gallery running since 2012, about
// 4,400 sites tagged by industry, style, layout and color: product, studio,
// automotive and SaaS sites (Apple, Polestar, Fly.io, Roadster...). Its
// /website/page/<n>/ listing shows about 70 cards a page newest first, 63 pages
// deep (page 1 is /website/); a page past the last one is a 404, which ends the
// listing. Cards link only to /website/<slug>/, whose "Visit site" button links
// out to the site (with ?utm_source=reeoo, which normalizing drops), so the
// listing is read through `paged` with each detail page as the entry, and one
// detail page is fetched per entry `paged` reports as new. The card's industry
// pills are mapped to an industry, minus technology and corporate, which it puts
// on sites of every kind. robots.txt allows everything.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";
import { industryFromTags } from "../industry.js";
import { paged } from "./paged.js";

const BASE = "https://reeoo.com";
const IGNORED = new Set(["technology", "corporate"]);

export const name = "reeoo";

export async function* listing({ limit }) {
  try {
    for await (const entry of details(limit)) {
      let html;
      try {
        html = await fetchHtml(entry.sourceRef);
      } catch (err) {
        console.warn(`[${name}] skipping ${entry.sourceRef}: ${err.message}`);
        continue;
      }
      const $ = cheerio.load(html);
      const url = $("a.ghost-button[target='_blank'][href^='http']").filter((_, a) => /visit site/i.test($(a).text())).first().attr("href");
      if (url) yield { ...entry, url };
    }
  } catch (err) {
    if (!/^HTTP 404 for .*\/website\/page\/\d+\/$/.test(err.message)) throw err;
  }
}

// The listing's cards, with the detail page standing in for the site's URL:
// reeoo.com is on the blocklist, so `paged` dedupes them by sourceRef alone.
function details(limit) {
  return paged({
    name,
    limit,
    maxPages: 150,
    pageUrl: (n) => (n > 1 ? `${BASE}/website/page/${n}/` : `${BASE}/website/`),
    parse: ($) =>
      $("article.case-card").map((_, el) => {
        const card = $(el);
        const link = card.find("a.card-title-link[href^='/website/']").first();
        const href = link.attr("href");
        if (!href || !/^\/website\/[\w-]+\/$/.test(href)) return null;
        const tags = card.find("a.property-pill[href^='/website/industry/']")
          .map((_, a) => $(a).attr("href").split("/")[3]).get()
          .filter((slug) => slug && !IGNORED.has(slug));
        const ref = BASE + href;
        return {
          url: ref,
          name: link.text().trim() || null,
          industryHint: industryFromTags(tags.map((s) => s.replace(/-/g, " "))),
          sourceRef: ref,
        };
      }).get(),
  });
}
