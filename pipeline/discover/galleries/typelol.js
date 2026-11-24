// Type.lol (type.lol), an index of the independent type world: about 1,100
// foundries, from one-person studios to Commercial Type, Playtype and
// Typotheque. A foundry's own site is usually a type-led showcase in itself.
// Its sitemap lists every /f/<slug> foundry page; foundries in the "New on
// Type.lol" RSS feed (recent releases) are read first, then the rest in sitemap
// order. Each page's "Foundry website" link (or its JSON-LD sameAs) is the
// foundry's site and its JSON-LD address names the country, mapped to an ISO
// code. Pages already stored as a site's sourceRef are not fetched again. Every
// foundry is Agency & Portfolio, as on Palate. robots.txt allows everything for
// crawlers other than SEO tools.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { countryCode } from "../country.js";
import { fetchHtml } from "../http.js";

const BASE = "https://type.lol";
const BATCH = 50;
const FOUNDRY = /^https:\/\/type\.lol\/f\/[^/?#]+$/;

export const name = "typelol";

function organization($) {
  for (const el of $("script[type='application/ld+json']").toArray()) {
    try {
      const data = JSON.parse($(el).text());
      if (data?.["@type"] === "Organization") return data;
    } catch { /* not JSON */ }
  }
  return {};
}

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const all = $map("url > loc").map((_, el) => $map(el).text().trim()).get().filter((ref) => FOUNDRY.test(ref));
  if (!all.length) console.warn(`[${name}] no /f/ foundry pages in the sitemap; its format may have changed`);
  let recent = [];
  try {
    const $feed = cheerio.load(await fetchHtml(`${BASE}/feed.rss`), { xml: true });
    recent = $feed("item > link").map((_, el) => $feed(el).text().trim()).get().filter((ref) => FOUNDRY.test(ref));
  } catch (err) {
    console.warn(`[${name}] could not read the feed: ${err.message}`);
  }
  const refs = [...new Set([...recent, ...all])];
  let yielded = 0;
  for (let i = 0; i < refs.length && yielded < limit; i += BATCH) {
    const batch = refs.slice(i, i + BATCH);
    const known = await knownSourceRefs(batch);
    for (const ref of batch) {
      if (yielded >= limit) return;
      if (known.has(ref)) continue;
      let html;
      try {
        html = await fetchHtml(ref);
      } catch (err) {
        console.warn(`[${name}] skipping ${ref}: ${err.message}`);
        continue;
      }
      const $ = cheerio.load(html);
      const org = organization($);
      const sameAs = [].concat(org.sameAs || []).find((u) => /^https?:\/\//.test(u));
      const url = $("a[href^='http']").filter((_, a) => $(a).text().trim() === "Foundry website").first().attr("href") || sameAs;
      if (!url || /^https?:\/\/([^/]+\.)?type\.lol\b/i.test(url)) continue;
      yielded++;
      yield {
        url,
        name: org.name || $("h1").first().text().trim() || null,
        industryHint: "Agency & Portfolio",
        countryHint: countryCode(org.address?.addressCountry),
        sourceRef: ref,
      };
    }
  }
}
