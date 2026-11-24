// Storeinspo (storeinspo.com), a hand-picked gallery of about 50 well-designed
// Shopify stores (Atoms, Seedlip, Rothy's, Flamingo Estate, HexClad,
// Otherland...). It is a Framer site; its sitemap lists every /website/<slug>
// page, and each page names the store in its h1, links to it with "Visit
// website" and tags it with categories (Footwear, Beverages, Home Decor...).
// Pages already stored as a site's sourceRef are not fetched again. The first
// category that maps to an industry wins, else E-commerce, since every entry
// is a store. Its Shopify affiliate link is never a site. robots.txt allows
// everything.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://storeinspo.com";
const BATCH = 50;
const SITE_PAGE = /^https:\/\/storeinspo\.com\/website\/[^/?#]+$/;

export const name = "storeinspo";

const INDUSTRY_BY_CATEGORY = {
  beverage: "Food & Drink",
  food: "Food & Drink",
  clothing: "Fashion",
  footwear: "Fashion",
  jewellery: "Fashion",
  accessories: "Fashion",
  beauty: "Health",
  "personal-care": "Health",
  "health-and-wellness": "Health",
  "home-decor": "Architecture & Interior",
  charitable: "Nonprofit",
};

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const refs = [...new Set($map("loc").map((_, el) => $map(el).text().trim()).get().filter((u) => SITE_PAGE.test(u)))];
  if (!refs.length) console.warn(`[${name}] no /website/ pages in the sitemap; its format may have changed`);
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
      const visit = $("a[href^='http']").filter((_, a) => /visit website/i.test($(a).text())).first();
      const url = visit.attr("href")?.trim();
      if (!url || /^https?:\/\/([^/]+\.)?(storeinspo\.com|shopify\.pxf\.io)\b/i.test(url)) continue;
      // The page's own category links sit between its h1 and the visit link;
      // the ones before the h1 are the site menu.
      const start = html.indexOf("<h1");
      const end = html.indexOf(`href="${visit.attr("href")}"`, start);
      const categories = start >= 0 && end > start
        ? [...html.slice(start, end).matchAll(/href="\.\.\/([a-z-]+)"/g)].map((m) => m[1])
        : [];
      const industry = categories.map((c) => INDUSTRY_BY_CATEGORY[c]).find(Boolean) ?? "E-commerce";
      yielded++;
      yield { url, name: $("h1").first().text().replace(/\s+/g, " ").trim() || null, industryHint: industry, sourceRef: ref };
    }
  }
}
