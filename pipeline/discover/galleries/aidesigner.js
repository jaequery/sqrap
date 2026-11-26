// AIDesigner's reference library (aidesigner.ai/references), a hand-picked set of
// live websites filed by section (hero, features, footer, pricing...) and by
// industry or style (SaaS, AI, fintech, e-commerce, agency, editorial, dark, 3D):
// Granola, Resend, Departamento, Aesop, Aman, basement.studio, Cosmos, Flighty.
// Each of the 35 /references/websites/<collection> pages in the sitemap, and the
// /references hub, serves its first 24 cards in its Next.js flight data, each card
// naming the site, its address, its platform and its industry tags; the rest of
// a collection sits behind a sign-up wall that redirects to /library, which
// robots.txt disallows, so only the served cards are read (about 340 sites,
// 36 requests for the whole gallery). Collections are read in the sitemap's order,
// web cards only (app screens skipped), each address once, the collection page
// kept as the source and the card's first mappable industry tag as the industry.
// robots.txt allows /references.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";
import { industryFromTags } from "../industry.js";
import { flightData, objectAt } from "./catalog.js";

const BASE = "https://www.aidesigner.ai";
const COLLECTION = /^https:\/\/www\.aidesigner\.ai\/references\/websites\/[a-z0-9-]+$/;
const OWN = /^https?:\/\/([^/]+\.)?aidesigner\.ai\b/i;

export const name = "aidesigner";

// The hub, then the /references/websites/<collection> pages in the sitemap's order.
export function collectionPages(xml) {
  const seen = new Set([`${BASE}/references`]);
  for (const [, loc] of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) {
    if (COLLECTION.test(loc)) seen.add(loc);
  }
  return [...seen];
}

// The card's first industry tag that maps to a taxonomy industry.
function industry(tags) {
  for (const tag of [].concat(tags ?? [])) {
    if (typeof tag !== "string" || tag === "consumer-app") continue;
    const hit = industryFromTags(tag.replace(/-/g, " "));
    if (hit) return hit;
  }
  return null;
}

// The web cards a collection page serves, in page order.
export function cards(text) {
  const out = [];
  for (const m of text.matchAll(/"card":\{"id":/g)) {
    const card = objectAt(text, m.index + '"card":'.length);
    const url = typeof card?.url === "string" ? card.url.trim() : "";
    if (card?.platform !== "web" || !/^https?:\/\//i.test(url) || OWN.test(url)) continue;
    out.push({ url, name: String(card.site ?? "").replace(/\s+/g, " ").trim() || null, industryHint: industry(card.industry) });
  }
  return out;
}

const key = (url) => url.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/[/?#].*$/, "");

export async function* listing({ limit }) {
  let pages;
  try {
    pages = collectionPages(await fetchHtml(`${BASE}/sitemap.xml`));
  } catch (err) {
    console.warn(`[${name}] skipping: ${err.message}`);
    return;
  }
  if (pages.length < 2) console.warn(`[${name}] no /references/websites/ pages in the sitemap; its format may have changed`);
  const seen = new Set();
  let yielded = 0;
  for (const page of pages) {
    let list;
    try {
      list = cards(flightData(cheerio.load(await fetchHtml(page))));
    } catch (err) {
      console.warn(`[${name}] skipping ${page}: ${err.message}`);
      continue;
    }
    for (const card of list) {
      if (yielded >= limit) return;
      if (seen.has(key(card.url))) continue;
      seen.add(key(card.url));
      yielded++;
      yield { ...card, sourceRef: page };
    }
  }
}
