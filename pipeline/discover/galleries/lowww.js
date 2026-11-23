// Lowww (lowww.directory), a hand-picked directory of about 200 low-carbon,
// lightweight sites (Endel, Hundred Rabbits, RATP group...), each scored by
// the CO2 one visit emits. It lists them newest first, paged with /page:<n>,
// 21 a page; every card links straight out to the site, and the
// /websites/<slug> page named in its screenshot path is kept as the source,
// so no page per site is fetched. A page past the last one is a 404, which
// ends the listing. Entries carry no industry.
import { paged } from "./paged.js";

const BASE = "https://lowww.directory";

export const name = "lowww";

export async function* listing({ limit }) {
  try {
    yield* pages(limit);
  } catch (err) {
    if (!/^HTTP 404 for .*\/page:\d+$/.test(err.message)) throw err;
  }
}

function pages(limit) {
  return paged({
    name,
    limit,
    maxPages: 40,
    pageUrl: (n) => (n > 1 ? `${BASE}/page:${n}` : `${BASE}/`),
    parse: ($, pageUrl) =>
      $(".website").map((_, el) => {
        const card = $(el);
        const url = card.find("a.link-website[href^='http']").first().attr("href");
        if (!url) return null;
        const slug = card.find(".screenshot-website img").attr("src")?.match(/\/media\/pages\/websites\/([^/]+)\//)?.[1];
        return {
          url,
          name: card.find("a.link-website").first().text().trim() || null,
          sourceRef: slug ? `${BASE}/websites/${slug}` : pageUrl,
        };
      }).get(),
  });
}
