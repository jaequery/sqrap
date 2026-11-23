// tiny blocks (tinyblocks.cc), a hand-picked gallery of e-commerce store
// designs from DTC brands (Ferm Living, Tylko, Graza, Snocks, Hears...), each
// shown as home, collection, product and cart pages. Its sitemap lists one
// /brand/<slug> page per store, read in order (brand pages carry no lastmod);
// each has a "Visit Shop" link to the store, and pages already stored as a
// site's sourceRef are not fetched again. Fashion and jewelry tags are
// Fashion, food and drinks Food & Drink, every other store E-commerce.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://www.tinyblocks.cc";
const BATCH = 50;

const INDUSTRY = { "fashion": "Fashion", "jewelry": "Fashion", "food & drinks": "Food & Drink" };

export const name = "tinyblocks";

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const refs = $map("loc").map((_, el) => $map(el).text().trim()).get()
    .filter((loc) => loc.startsWith(`${BASE}/brand/`));
  if (!refs.length) console.warn(`[${name}] no /brand/ pages in the sitemap; its format may have changed`);
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
      const url = $("a.btn-submit[href^='http']").first().attr("href");
      if (!url) continue;
      yielded++;
      const tags = $(".tag").map((_, t) => $(t).text().trim().toLowerCase()).get();
      const industry = tags.map((t) => INDUSTRY[t]).find(Boolean) || "E-commerce";
      yield { url, name: $("h1").first().text().trim() || null, industryHint: industry, sourceRef: ref };
    }
  }
}
