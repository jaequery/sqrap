// See*Saw (seesaw.website). Its /sites.json lists every site newest first (about
// 920 in late 2026, in the sitemap and allowed by robots.txt); the home page now
// serves only the newest 24, so it is the fallback when the JSON fails. Each site's
// /websites/<slug> page links out to the site with a ?ref=seesaw button (the JSON's
// link when the button is missing) and tags it with categories, mapped to an
// industry. Pages already stored as a site's sourceRef are not fetched again.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml, fetchJson } from "../http.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://www.seesaw.website";
const BATCH = 50;

// Category slugs that need rewording before industryFromTags can match them.
const SLUG_TAGS = { "venture-capital": "investment", venture: "investment", "design-tools": "software" };

export const name = "seesaw";

const ref = (slug) => `${BASE}/websites/${encodeURIComponent(slug)}`;

// Every site, newest first, as Map<sourceRef, link from the JSON or null>.
async function entries() {
  try {
    const sites = await fetchJson(`${BASE}/sites.json`);
    if (!Array.isArray(sites)) throw new Error("not an array");
    const out = new Map();
    for (const s of sites) if (s?.slug && !out.has(ref(s.slug))) out.set(ref(s.slug), typeof s.link === "string" ? s.link : null);
    if (out.size) return out;
    throw new Error("no sites");
  } catch (err) {
    console.warn(`[${name}] ${BASE}/sites.json unusable (${err.message}); reading the home page's newest sites`);
  }
  const $home = cheerio.load(await fetchHtml(`${BASE}/`));
  const refs = $home("a[href^='/websites/']").map((_, a) => new URL($home(a).attr("href"), BASE).href).get();
  return new Map(refs.map((r) => [r, null]));
}

export async function* listing({ limit }) {
  const links = await entries();
  const refs = [...links.keys()];
  if (!refs.length) console.warn(`[${name}] no sites in ${BASE}/sites.json or on ${BASE}/; the gallery may have changed`);
  let yielded = 0;
  for (let i = 0; i < refs.length && yielded < limit; i += BATCH) {
    const batch = refs.slice(i, i + BATCH);
    const known = await knownSourceRefs(batch);
    for (const sourceRef of batch) {
      if (yielded >= limit) return;
      if (known.has(sourceRef)) continue;
      const $ = cheerio.load(await fetchHtml(sourceRef));
      const url = $("a[href^='http'][href*='ref=seesaw']").first().attr("href") || links.get(sourceRef);
      if (!url?.startsWith("http")) continue;
      const tags = $("a[href^='/category/']").map((_, a) => $(a).attr("href").split("/").pop()).get();
      yielded++;
      yield {
        url,
        name: $("h1").first().text().trim() || null,
        industryHint: industryFromTags(tags.map((s) => SLUG_TAGS[s] ?? s.replace(/-/g, " "))),
        sourceRef,
      };
    }
  }
}
