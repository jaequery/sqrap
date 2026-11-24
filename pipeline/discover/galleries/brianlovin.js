// Brian Lovin's Sites (brianlovin.com/sites), a designer's hand-picked list of
// about 190 well-made sites, mostly design engineers' and designers' own
// portfolios plus a few product sites (Stripe, Mike Matas, Daniel Eden, Josh
// Puckett, Quiver...). One page lists every site; each row's name links
// straight to it, so the list page is the sourceRef. Rows carry no industry.
// Known domains are skipped downstream. robots.txt allows everything but /api/
// for crawlers other than AI training bots.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

const PAGE = "https://brianlovin.com/sites";

export const name = "brianlovin";

export async function* listing({ limit }) {
  const $ = cheerio.load(await fetchHtml(PAGE));
  const seen = new Set();
  const entries = $("a.text-primary[href^='http'][target='_blank']").map((_, el) => {
    const url = $(el).attr("href");
    if (/^https?:\/\/([^/]+\.)?brianlovin\.com\b/i.test(url) || seen.has(url)) return null;
    seen.add(url);
    return { url, name: $(el).text().replace(/\s+/g, " ").trim() || null, sourceRef: PAGE };
  }).get();
  if (!entries.length) console.warn(`[${name}] no site rows on ${PAGE}; the markup may have changed`);
  yield* entries.slice(0, limit);
}
