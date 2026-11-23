// Crypto Design Club (cryptodesign.club), a hand-picked gallery of crypto and
// web3 product sites (Phantom, Optimism, Tenderly, Family, Status...). Its
// sitemap lists every /product/<slug> page (about 50); each has a "Visit"
// button beside the h1 linking to the site. Pages already stored as a site's
// sourceRef are not fetched again. The page's category tag (wallet, defi,
// infrastructure...) is mapped to an industry, else Crypto.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://cryptodesign.club";
const BATCH = 50;

export const name = "cryptodesignclub";

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const refs = $map("url > loc").map((_, el) => $map(el).text().trim()).get()
    .filter((u) => u.startsWith(`${BASE}/product/`));
  if (!refs.length) console.warn(`[${name}] no /product/ pages in the sitemap; its format may have changed`);
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
      const h1 = $("h1").first();
      const url = h1.parent().find("a[href^='http']").first().attr("href");
      if (!url) continue;
      h1.find("span").remove();
      const categories = $("a[href^='/category/']").map((_, el) => $(el).text().trim()).get();
      yielded++;
      yield {
        url,
        name: h1.text().trim() || null,
        industryHint: industryFromTags(categories) ?? "Crypto",
        sourceRef: ref,
      };
    }
  }
}
