// DTC Gallery (dtc.gallery), a hand-picked gallery of direct-to-consumer brand
// sites, mostly from Australia and New Zealand (Maap, Recess, Lyka, Who Gives a
// Crap, St. Ali, Memobottle). The home page serves every entry its sitemap
// lists, each card naming the brand, one category and an arrow that links
// straight to the store, so the whole gallery is one request. Each card's
// brand page is its sourceRef; categories map to industry, E-commerce when
// none fits, and `.au`/`.nz` stores get their country.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

const BASE = "https://www.dtc.gallery";

const INDUSTRY = {
  beverages: "Food & Drink",
  food: "Food & Drink",
  "health-and-wellness": "Health",
  body: "Health",
  apparel: "Fashion",
};

export const name = "dtcgallery";

export async function* listing({ limit }) {
  const $ = cheerio.load(await fetchHtml(`${BASE}/`));
  const seen = new Set();
  const entries = [];
  $("a[target='_blank'][href^='http']").each((_, el) => {
    const card = $(el).parent();
    const pills = card.find("a[href^='/']");
    const brand = pills.filter((_, a) => !$(a).attr("href").startsWith("/category/")).first();
    const slug = brand.attr("href");
    if (!slug || slug === "/" || seen.has(slug)) return;
    const url = $(el).attr("href");
    let host;
    try { host = new URL(url).hostname; } catch { return; }
    if (/(^|\.)dtc\.gallery$/i.test(host)) return;
    seen.add(slug);
    const category = pills.filter((_, a) => $(a).attr("href").startsWith("/category/")).first().attr("href")?.slice("/category/".length);
    entries.push({
      url,
      name: brand.text().trim() || null,
      industryHint: INDUSTRY[category] ?? "E-commerce",
      countryHint: host.match(/\.(au|nz)$/i)?.[1].toUpperCase() ?? null,
      sourceRef: `${BASE}${slug}`,
    });
  });
  if (!entries.length) console.warn(`[${name}] no entries on ${BASE}/; the gallery markup may have changed`);
  yield* entries.slice(0, limit);
}
