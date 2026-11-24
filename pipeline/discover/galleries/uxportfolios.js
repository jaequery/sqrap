// UX Portfolios (uxportfolios.design), a hand-picked gallery of about 60
// product and UX designer portfolios, each with a curator's note (Rauno
// Freiberg, Ryo Lu, Luis Bizarro, Daniel Sun...). Its sitemap lists every
// /portfolios/<slug> page (every lastmod is the same, so in sitemap order);
// role and tag pages are skipped. One page is fetched per new portfolio, whose
// "Visit" button links out to it. Every site is tagged Agency & Portfolio.
// Pages already stored as a site's sourceRef are not fetched again. robots.txt
// allows everything but /admin.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://www.uxportfolios.design";

export const name = "uxportfolios";

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const refs = [...new Set($map("url > loc").map((_, el) => $map(el).text().trim()).get()
    .filter((loc) => /^https:\/\/www\.uxportfolios\.design\/portfolios\/[\w-]+$/.test(loc)))];
  if (!refs.length) {
    console.warn(`[${name}] no /portfolios/ pages in the sitemap; its format may have changed`);
    return;
  }
  const known = await knownSourceRefs(refs);
  let yielded = 0;
  for (const ref of refs) {
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
    const url = $("a.pd-pin__visit[href^='http']").first().attr("href");
    if (!url) continue;
    yielded++;
    yield {
      url,
      name: $("h1.pd-pin__title").first().text().trim() || null,
      industryHint: "Agency & Portfolio",
      sourceRef: ref,
    };
  }
}
