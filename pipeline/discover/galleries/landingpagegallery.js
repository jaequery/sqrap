// Landing Page Gallery (landingpagegallery.com), a gallery of about 3,800
// landing pages, mostly startup, SaaS and DTC home pages, tagged by page type
// and section. Its sitemap lists every /examples/<slug> page with a lastmod,
// read newest first; each page has a "Visit" link to the live page. Pages
// already stored as a site's sourceRef are not fetched again. Pages carry no
// industry.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://landingpagegallery.com";
const BATCH = 50;

export const name = "landingpagegallery";

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const refs = $map("url").map((_, el) => ({
    loc: $map(el).find("loc").text().trim(),
    lastmod: $map(el).find("lastmod").text().trim(),
  })).get()
    .filter((u) => u.loc.startsWith(`${BASE}/examples/`))
    .sort((a, b) => b.lastmod.localeCompare(a.lastmod))
    .map((u) => u.loc);
  if (!refs.length) console.warn(`[${name}] no /examples/ pages in the sitemap; its format may have changed`);
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
      const url = $("a[href^='http'][target='_blank']")
        .filter((_, a) => $(a).prev("span").text().trim() === "Live page").first().attr("href");
      if (!url) continue;
      yielded++;
      const title = $("h1").first().text().replace(/\s+(website design|landing page)$/i, "").trim();
      yield { url, name: title || null, sourceRef: ref };
    }
  }
}
