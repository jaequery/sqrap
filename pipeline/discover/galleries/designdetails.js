// Design Details (designdetails.io), a curated library of about 290 startup,
// SaaS, climate-tech and portfolio sites (Attio, Oklo, Exowatt, Contra Labs...)
// with full-page captures tagged by industry, site type and section. Its
// sitemap lists every /websites/<slug> page newest first (no lastmod); the
// listings link only to those pages, so one is fetched per new site for its
// outbound domain link (`a.explore-domain`, a ?ref=designdetails.io link that
// may point at a subpage; normalizing reduces it to the home page). Pages
// already stored as a site's sourceRef are not fetched again. The Industry
// category is mapped (Creative is Agency & Portfolio); the "Portfolio" site type
// is not used, since it is also given to company sites. robots.txt allows
// everything but /studio, /method, /account and /api.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://designdetails.io";
const BATCH = 50;

export const name = "designdetails";

// Categories without an entry (communication, energy, hardware, marketing,
// other) carry no industry hint.
const INDUSTRY_BY_CATEGORY = {
  ai: "AI",
  creative: "Agency & Portfolio",
  crm: "SaaS",
  "developer-tools": "Developer tools",
  education: "Education",
  entertainment: "Entertainment",
  finance: "Finance",
  health: "Health",
  productivity: "Productivity",
  "real-estate": "Real estate",
  retail: "E-commerce",
  travel: "Travel",
};

function industryOf($) {
  const category = $("dl.explore-site-facts a[href^='/categories/']").first().attr("href")?.split("/")[2];
  return INDUSTRY_BY_CATEGORY[category] ?? null;
}

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const refs = $map("loc").map((_, el) => $map(el).text().trim()).get()
    .filter((loc) => /^https:\/\/designdetails\.io\/websites\/[^/?#]+$/.test(loc));
  if (!refs.length) console.warn(`[${name}] no /websites/ pages in the sitemap; its format may have changed`);
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
      const url = $("a.explore-domain[href^='http']").first().attr("href");
      if (!url) continue;
      yielded++;
      yield { url, name: $("h1").first().text().trim() || null, industryHint: industryOf($), sourceRef: ref };
    }
  }
}
