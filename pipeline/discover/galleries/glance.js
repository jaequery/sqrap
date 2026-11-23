// Glance (glance.fyi), a gallery of SaaS and startup hero sections (Ahrefs,
// Agorapulse, Airbyte...), about 220 sites, tagged by product category and hero
// style. The listings link only to /hero-section/<slug> pages, so its sitemap
// is read in order (it carries no lastmod) and one page is fetched per new site
// for its "visit website" link. Older snapshots and A/B test variants of a
// site (slugs ending in a year or -variant-<n>) are skipped, and pages already
// stored as a site's sourceRef are not fetched again. The first category tag that maps to an industry wins, else SaaS.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://www.glance.fyi";
const BATCH = 50;
const SNAPSHOT = /-((19|20)\d{2}|variation-\d+|variant-\d+)$/;

export const name = "glance";

const INDUSTRY_BY_TAG = [
  [/^artificial-intelligence$/, "AI"],
  [/^(developer|developer-platform|database|hosting|monitoring|content-delivery-network|qa|bug-reporting)$/, "Developer tools"],
  [/^(finance|payments|payroll)$/, "Finance"],
  [/^healthcare$/, "Health"],
  [/^learning$/, "Education"],
  [/^(ecommerce|meal-kit|clothing-rental)$/, "E-commerce"],
  [/^music$/, "Music"],
  [/^(entertainment|streaming)$/, "Entertainment"],
  [/^(community|social-media)$/, "Community & Social"],
  [/^(productivity-tool|project-management|knowledge-management|meeting-software|scheduling|writing|presentation)$/, "Productivity"],
];

// Tags are listed with the primary category first.
function industryOf(tags) {
  for (const tag of tags) {
    const hit = INDUSTRY_BY_TAG.find(([re]) => re.test(tag));
    if (hit) return hit[1];
  }
  return "SaaS";
}

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const refs = $map("loc").map((_, el) => $map(el).text().trim()).get()
    .filter((loc) => loc.startsWith(`${BASE}/hero-section/`) && !SNAPSHOT.test(loc));
  if (!refs.length) console.warn(`[${name}] no /hero-section/ pages in the sitemap; its format may have changed`);
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
      const url = $("a.visit-website[href^='http']").first().attr("href");
      if (!url) continue;
      yielded++;
      const tags = $("a[href^='/tags/']").map((_, a) => $(a).attr("href").split("/")[2]).get();
      yield { url, name: $("h1").first().text().trim() || null, industryHint: industryOf(tags), sourceRef: ref };
    }
  }
}
