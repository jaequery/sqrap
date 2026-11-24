// Brutalist Garden (brutalist-garden.webflow.io), "a website archive" of about
// 150 raw, experimental and type-led sites, mostly designer and studio
// portfolios, foundries and art projects (Talia Cotton, U.S. Graphics,
// Camelot Typefaces, Wayside Studio...), some on Cargo or Readymag. One page
// lists every site; each card's screenshot links straight to it and its <h2>
// names it, so the archive page is the sourceRef. Cards carry no industry.
// Known domains are skipped downstream. There is no robots.txt.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

const BASE = "https://brutalist-garden.webflow.io";

export const name = "brutalistgarden";

export async function* listing({ limit }) {
  const $ = cheerio.load(await fetchHtml(`${BASE}/`));
  const entries = $(".website-wrapper").map((_, el) => {
    const card = $(el);
    const url = card.find(".image-link-wrapper a[href^='http'], .website-info a[href^='http']").first().attr("href");
    if (!url || /^https?:\/\/brutalist-garden\.webflow\.io\b/i.test(url)) return null;
    return { url, name: card.find("h2").first().text().replace(/\s+/g, " ").trim() || null, sourceRef: `${BASE}/` };
  }).get();
  if (!entries.length) console.warn(`[${name}] no site cards on ${BASE}/; the markup may have changed`);
  yield* entries.slice(0, limit);
}
