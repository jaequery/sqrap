// Browsing Mode (browsingmode.com), a hand-picked gallery of studio, portfolio,
// fashion, beauty and publishing sites (ETOILE, Wedge, Volker Haug...). Its
// Framer cards render server-side and link straight out to the site with
// ?ref=browsingmode.com (which normalizing drops), so no detail page exists and
// each listing page is its entries' sourceRef. The home page shows only the
// latest few, so the adapter reads its three type pages and six category
// pages, which together list every site (about 690), and maps the page to an
// industry. A site on several pages is yielded once.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

const BASE = "https://browsingmode.com";

// Category pages first: their industry is more specific than a type's.
const PAGES = [
  ["category/fashion", "Fashion"],
  ["category/beauty", "Health"],
  ["category/food-drink", "Food & Drink"],
  ["category/home-living", "Architecture & Interior"],
  ["category/media-publishing", "Media & Publishing"],
  ["category/technology", "SaaS"],
  ["type/ecommerce", "E-commerce"],
  ["type/agency", "Agency & Portfolio"],
  ["type/portfolio", "Agency & Portfolio"],
];

export const name = "browsingmode";

export async function* listing({ limit }) {
  const seen = new Set();
  let yielded = 0;
  for (const [path, industryHint] of PAGES) {
    const pageUrl = `${BASE}/${path}`;
    let html;
    try {
      html = await fetchHtml(pageUrl);
    } catch (err) {
      console.warn(`[${name}] skipping ${pageUrl}: ${err.message}`);
      continue;
    }
    const $ = cheerio.load(html);
    const links = $("a[href^='http'][href*='ref=browsingmode.com']");
    if (!links.length) console.warn(`[${name}] no entries on ${pageUrl}; the gallery markup may have changed`);
    for (const el of links.toArray()) {
      if (yielded >= limit) return;
      const url = $(el).attr("href");
      if (seen.has(url)) continue;
      seen.add(url);
      // The card's icon is labelled "<name> website icon".
      const icon = $(el).parent().parent().find("img[alt$=' website icon']").first().attr("alt");
      yielded++;
      yield { url, name: icon?.replace(/ website icon$/, "").trim() || null, industryHint, sourceRef: pageUrl };
    }
  }
}
