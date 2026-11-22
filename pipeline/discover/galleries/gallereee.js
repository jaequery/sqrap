// Gallereee (gallereee.com), a handpicked gallery of designer, studio,
// photographer and director portfolio sites. It is a Framer site whose listing
// loads more entries client-side, so its sitemap is read instead: it lists
// every /websites/<slug> page newest first and carries no lastmod. Each page's
// "Visit" button (a[data-framer-name^="Primary"]) links out to the site. Every
// site is tagged Agency & Portfolio. Pages already stored as a site's sourceRef
// are not fetched again.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://www.gallereee.com";
const BATCH = 50;

export const name = "gallereee";

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const refs = [...new Set($map("url > loc").map((_, el) => $map(el).text().trim()).get()
    .filter((ref) => /^https:\/\/www\.gallereee\.com\/websites\/[^/]+$/.test(ref)))];
  if (!refs.length) console.warn(`[${name}] no /websites/ pages in the sitemap; its format may have changed`);
  let yielded = 0;
  for (let i = 0; i < refs.length && yielded < limit; i += BATCH) {
    const batch = refs.slice(i, i + BATCH);
    const known = await knownSourceRefs(batch);
    for (const ref of batch) {
      if (yielded >= limit) return;
      if (known.has(ref)) continue;
      const $ = cheerio.load(await fetchHtml(ref));
      const url = $("a[data-framer-name^='Primary'][href^='http']").first().attr("href");
      if (!url) continue;
      const title = $("title").text().replace(/\s*·\s*Portfolio Inspiration\s*$/i, "").trim();
      yielded++;
      yield { url, name: title || null, industryHint: "Agency & Portfolio", sourceRef: ref };
    }
  }
}
