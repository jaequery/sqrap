// Type Foundry Directory (typefoundry.directory), a hand-kept directory of
// about 400 independent type foundries (Bastarda Type, Bold Monday, Emtype,
// Element Type...), each with a screenshot of its site. A foundry's own site is
// usually a type-led showcase in itself. One page lists every foundry; each
// card's name links straight to its site, so the directory page is the
// sourceRef, and its data-countries attribute names the country, mapped to an
// ISO code when there is just one.
// Every foundry is Agency & Portfolio, as on Palate. Known domains are skipped
// downstream. There is no robots.txt.
import * as cheerio from "cheerio";
import { countryCode } from "../country.js";
import { fetchHtml } from "../http.js";

const BASE = "https://typefoundry.directory";

export const name = "typefoundrydirectory";

export async function* listing({ limit }) {
  const $ = cheerio.load(await fetchHtml(`${BASE}/`));
  const entries = $("div.foundry").map((_, el) => {
    const card = $(el);
    const link = card.find(".foundry--name a[href^='http']").first();
    const url = link.attr("href") || card.find("a.thumb-container[href^='http']").attr("href");
    if (!url || /^https?:\/\/([^/]+\.)?typefoundry\.directory\b/i.test(url)) return null;
    return {
      url,
      name: link.text().replace(/\s+/g, " ").trim() || null,
      industryHint: "Agency & Portfolio",
      // Several countries are joined by hyphens too, so only a single one maps.
      countryHint: countryCode(card.attr("data-countries")),
      sourceRef: `${BASE}/`,
    };
  }).get();
  if (!entries.length) console.warn(`[${name}] no foundry cards on ${BASE}/; the markup may have changed`);
  yield* entries.slice(0, limit);
}
