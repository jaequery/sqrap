// Cart Craze (cartcraze.com), a hand-picked gallery of e-commerce website design:
// about 1,720 online stores, mostly fashion, beauty, home and food brands from the
// US, UK and Europe (Arc'teryx, Herschel Supply Co., Cuyana, Lilly Pulitzer, Free
// People, Mast Brothers, Kurt Geiger). It began as a Drupal site and is now served
// as a static rebuild; most picks are years old, but the stores are live brands,
// so the judge decides on their current design. Its /ecommerce-website-inspiration
// page lists every store on one page, newest first, each card linking to the
// store's /<slug> detail page, whose screenshot links out to the store. That one
// listing is read, then one detail page per new store; detail pages already
// stored as a site's sourceRef are not fetched again. Every store is tagged
// E-commerce (the categories on the page are the site-wide nav, not the store's).
// It keeps the normal quality bar (not in CURATED_SOURCES). robots.txt allows
// everything.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://cartcraze.com";
const BATCH = 50;

export const name = "cartcraze";

// The listing's cards, in page order: [{ ref, name }].
export function parseListing(html) {
  const $ = cheerio.load(html);
  const seen = new Set();
  return $(".view-gallery .views-bootstrap-grid-plugin-style a[href^='/']").map((_, el) => {
    const href = $(el).attr("href");
    if (!/^\/[^/?#]+$/.test(href)) return null;
    const ref = new URL(href, BASE).href;
    if (seen.has(ref)) return null;
    seen.add(ref);
    return { ref, name: $(el).find("h4").first().text().replace(/\s+/g, " ").trim() || null };
  }).get().filter(Boolean);
}

// The store's address from a detail page, or null.
export function parseDetail(html) {
  const $ = cheerio.load(html);
  const href = $(".view-website-detail a[href^='http']").first().attr("href")?.trim();
  if (!href) return null;
  try {
    const url = new URL(href);
    return /^https?:$/.test(url.protocol) && !/(^|\.)cartcraze\.com$/i.test(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}

export async function* listing({ limit }) {
  const cards = parseListing(await fetchHtml(`${BASE}/ecommerce-website-inspiration`));
  if (!cards.length) console.warn(`[${name}] no stores on the listing page; its format may have changed`);
  let yielded = 0;
  for (let i = 0; i < cards.length && yielded < limit; i += BATCH) {
    const batch = cards.slice(i, i + BATCH);
    const known = await knownSourceRefs(batch.map((c) => c.ref));
    for (const card of batch) {
      if (yielded >= limit) return;
      if (known.has(card.ref)) continue;
      let url;
      try {
        url = parseDetail(await fetchHtml(card.ref));
      } catch (err) {
        console.warn(`[${name}] ${card.ref}: ${err.message}`);
        continue;
      }
      if (!url) continue;
      yielded++;
      yield { url, name: card.name, industryHint: "E-commerce", sourceRef: card.ref };
    }
  }
}
