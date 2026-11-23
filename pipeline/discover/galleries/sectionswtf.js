// Sections.wtf, a hand-picked gallery of about 280 sections (hero, pricing,
// CTA, footer...) from about 100 sites (Flighty, Craft, Jitter, Dia, REKKI...).
// Its home page lists every section newest first as a card titled
// "<Site> - <Section>"; cards without that separator (ads) are skipped. The
// cards are grouped by site, and for each new site the newest section page
// (/shots/<slug>) is fetched for its outbound site link (the `url` element).
// That page is the sourceRef; a site any of whose section pages is already
// stored is skipped. robots.txt allows everything.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://sections.wtf";
const BATCH = 50;

export const name = "sectionswtf";

// [{ name, refs }] in the order the home page lists them, newest first.
function sites(html) {
  const $ = cheerio.load(html);
  const bySite = new Map();
  const seen = new Set();
  $("a[href^='./shots/'], a[href^='/shots/']").each((_, a) => {
    const slug = $(a).attr("href").replace(/^\.?\/shots\//, "").split(/[?#]/)[0];
    if (!slug || slug.includes("/") || seen.has(slug)) return;
    seen.add(slug);
    const title = $(a).find("h1, h2, h3, h4, h5, h6, p").first().text().trim();
    const m = title.match(/^(.+?)\s+[-–—]\s+\S/);
    if (!m) return;
    const site = m[1].trim();
    if (!bySite.has(site)) bySite.set(site, { name: site, refs: [] });
    bySite.get(site).refs.push(`${BASE}/shots/${slug}`);
  });
  return [...bySite.values()];
}

export async function* listing({ limit }) {
  const list = sites(await fetchHtml(`${BASE}/`));
  if (!list.length) console.warn(`[${name}] no section cards on the home page; its format may have changed`);
  let yielded = 0;
  for (let i = 0; i < list.length && yielded < limit; i += BATCH) {
    const batch = list.slice(i, i + BATCH);
    const known = await knownSourceRefs(batch.flatMap((s) => s.refs));
    for (const site of batch) {
      if (yielded >= limit) return;
      if (site.refs.some((ref) => known.has(ref))) continue;
      const ref = site.refs[0];
      let html;
      try {
        html = await fetchHtml(ref);
      } catch (err) {
        console.warn(`[${name}] skipping ${ref}: ${err.message}`);
        continue;
      }
      const url = cheerio.load(html)("a[data-framer-name='url'][href^='http']").first().attr("href");
      if (!url) continue;
      yielded++;
      yield { url, name: site.name, sourceRef: ref };
    }
  }
}
