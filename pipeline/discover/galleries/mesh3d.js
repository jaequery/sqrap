// Mesh3D (mesh3d.gallery), a hand-picked gallery of 3D and WebGL websites
// (Igloo Inc., Lusion, Unseen Studio, Shopify Editions...). Its sitemap lists
// every /website/<slug> page (about 515); each has a "visit website" link to
// the site with ?utm_source=mesh3d.gallery (which normalizing drops). Pages
// already stored as a site's sourceRef are not fetched again. The page's theme
// tag (fintech, fashion-luxury, creative-agency...), else its type tag
// (studio-portfolio, saas-tech...), is mapped to an industry. Its experiments
// (WebGL demos, not sites) and makers pages are ignored.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://mesh3d.gallery";
const BATCH = 50;

export const name = "mesh3d";

const tag = ($, key) =>
  ($(`a[href^='/websites?${key}=']`).first().attr("href") || "").split("=").pop().replace(/-/g, " ") || null;

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const refs = $map("url > loc").map((_, el) => $map(el).text().trim()).get()
    .filter((u) => u.startsWith(`${BASE}/website/`));
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
      const url = $("a[data-umami-event-target='visit_website'][href^='http']").first().attr("href");
      if (!url) continue;
      const industryHint = industryFromTags(tag($, "theme")) ?? industryFromTags(tag($, "type"));
      yielded++;
      yield { url, name: $("h1").first().text().trim() || null, industryHint, sourceRef: ref };
    }
  }
}
