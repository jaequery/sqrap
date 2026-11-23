// Curate Gallery (curate.gallery), a hand-picked gallery of startup and
// product sites (Linear, Resend, Wise, Raycast, Runway, Paper...). Its cards
// render client-side, but the served page carries a plain list of every site
// in the gallery, each linking straight out to the site with its category, so
// no detail page exists and the listing is every entry's sourceRef. Template
// entries (a Framer marketplace page, not a site) are skipped.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://curate.gallery/";

export const name = "curategallery";

export async function* listing({ limit }) {
  const $ = cheerio.load(await fetchHtml(BASE));
  const entries = $("section.visually-hidden li").map((_, el) => {
    const link = $(el).find("a[href^='http']").first();
    const url = link.attr("href");
    if (!url || /\/templates?\//.test(url)) return null;
    const category = $(el).text().split(",").pop().trim();
    return {
      url,
      name: link.text().trim() || null,
      industryHint: industryFromTags(category),
      sourceRef: BASE,
    };
  }).get();
  if (!entries.length) console.warn(`[${name}] no entries on ${BASE}; the gallery markup may have changed`);
  yield* entries.slice(0, limit);
}
