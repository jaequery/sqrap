// Just a Design List (justadesignlist.com), a hand-picked directory of about
// 1,500 independent design studios (Pentagram-sized and one-person practices,
// branding, typography, motion, interactive). Its sitemap lists every
// /studio/<slug> page with a lastmod, read newest first; each page has a
// "Visit <studio>" link to the studio's own site and a /country/<slug> link,
// mapped to an ISO code. Pages already stored as a site's sourceRef are not
// fetched again. Every studio is Agency & Portfolio.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://justadesignlist.com";
const BATCH = 50;

export const name = "justadesignlist";

// Country slugs the English region names do not produce.
const COUNTRY_ALIASES = {
  usa: "US", england: "GB", scotland: "GB", wales: "GB", "northern-ireland": "GB",
  "the-netherlands": "NL", "czech-republic": "CZ", "south-korea": "KR", russia: "RU",
};

let countryCodes;
function countryCode(slug) {
  if (!slug) return null;
  if (COUNTRY_ALIASES[slug]) return COUNTRY_ALIASES[slug];
  if (!countryCodes) {
    countryCodes = new Map();
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b);
        const label = names.of(code);
        if (label && label !== code) countryCodes.set(label.toLowerCase().replace(/[^a-z]+/g, "-"), code);
      }
    }
  }
  return countryCodes.get(slug) || null;
}

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const refs = $map("url").map((_, el) => ({
    loc: $map(el).find("loc").text().trim(),
    lastmod: $map(el).find("lastmod").text().trim(),
  })).get()
    .filter((u) => u.loc.startsWith(`${BASE}/studio/`))
    .sort((a, b) => b.lastmod.localeCompare(a.lastmod))
    .map((u) => u.loc);
  if (!refs.length) console.warn(`[${name}] no /studio/ pages in the sitemap; its format may have changed`);
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
      const url = $("a[href^='http']").filter((_, a) => /^Visit\b/.test($(a).text().trim())).first().attr("href");
      if (!url) continue;
      yielded++;
      const country = ($("a[href^='/country/']").first().attr("href") || "").split("/")[2];
      yield {
        url,
        name: $("h1").first().text().trim() || null,
        industryHint: "Agency & Portfolio",
        countryHint: countryCode(country),
        sourceRef: ref,
      };
    }
  }
}
