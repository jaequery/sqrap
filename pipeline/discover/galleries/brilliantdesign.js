// Brilliant Design Collect (brilliantdesign.work), a Japanese gallery of
// "functional and beautiful" web design updated several times a week: brand,
// studio, campaign and anniversary sites, plus portfolios from abroad (Asobica,
// NITTOH 100 PICNIC, Palmo, David Laxer...). /page/<n> lists 84 sites newest
// first, about 35 pages deep; every card links straight out to the site and to
// its /archives/<id> page. Cards carry no category, so there is no industry
// hint. Recruiting sites (採用) are skipped, as they are mostly careers
// subpages of corporate sites. A page past the last one is a 404, which ends
// the listing. robots.txt disallows only /wp-admin/.
import { paged } from "./paged.js";

const BASE = "https://brilliantdesign.work";

export const name = "brilliantdesign";

export async function* listing({ limit }) {
  try {
    yield* pages(limit);
  } catch (err) {
    if (!/^HTTP 404 for .*\/page\/\d+$/.test(err.message)) throw err;
  }
}

function pages(limit) {
  return paged({
    name,
    limit,
    maxPages: 100,
    pageUrl: (n) => (n > 1 ? `${BASE}/page/${n}` : `${BASE}/`),
    parse: ($) =>
      $(".posts__item").map((_, el) => {
        const card = $(el);
        const url = card.find("a.posts__head[href^='http']").attr("href");
        const detail = card.find("a.posts__title[href*='/archives/']").attr("href");
        const title = card.find(".posts__txt").first().text().trim();
        if (!url || !detail || /採用/.test(title)) return null;
        return {
          url,
          name: title || null,
          industryHint: null,
          sourceRef: new URL(detail, BASE).href,
        };
      }).get(),
  });
}
