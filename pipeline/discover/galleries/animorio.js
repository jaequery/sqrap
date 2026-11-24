// Animorio (animorio.com), an Italian studio journal that takes apart the
// animation of one well-made site per "how it's made" article, about 70 so far
// and new ones most days since 2026: studios, cultural projects and brands
// (A24, Colonia Zacamil, Breakthrough Energy, Aupale Vodka...). Its English
// journal index (/en/journal/) lists every article newest first on one page;
// each card's "Open the site" pill links straight out to the site and names it
// in its aria-label, and the article is the sourceRef. Cards carry no industry.
// Known domains are skipped downstream. robots.txt allows everything but
// /scarica/ and /dati/.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

const BASE = "https://animorio.com";

export const name = "animorio";

export async function* listing({ limit }) {
  const $ = cheerio.load(await fetchHtml(`${BASE}/en/journal/`));
  const entries = $("li.scheda-articolo").map((_, el) => {
    const card = $(el);
    const site = card.find("a.scheda-articolo__sito[href^='http']").first();
    const url = site.attr("href");
    if (!url || /^https?:\/\/([^/]+\.)?animorio\.com\b/i.test(url)) return null;
    const article = card.find("a.scheda-articolo__link").attr("href");
    const label = (site.attr("aria-label") || "").match(/^Open (.+) in a new tab$/);
    return { url, name: label?.[1].trim() || null, sourceRef: article ? new URL(article, BASE).href : `${BASE}/en/journal/` };
  }).get();
  if (!entries.length) console.warn(`[${name}] no article cards on ${BASE}/en/journal/; the markup may have changed`);
  yield* entries.slice(0, limit);
}
