// BestSaaSWebDesigns (bestsaaswebdesigns.com), a hand-picked directory of about
// 550 SaaS marketing sites, each with a written design review: developer
// tools, AI, productivity, fintech and security products (Fly.io, Linear, Hex,
// Coda, Amp...), updated through November 2026. Its gallery shows 36 cards and
// loads the rest client-side, but its sitemap lists every /site/<slug> page,
// newest first (every lastmod is the same), so one page is fetched per new
// site; its JSON-LD WebPage `about` url is the site and its name carries the
// category ("Fly — Engineering & Infrastructure website design breakdown"),
// which is mapped to an industry. Sponsored cards sit only in the gallery and
// link with rel="sponsored"; they have no /site/ page. Pages already stored as
// a site's sourceRef are not fetched again. robots.txt allows everything but
// /admin and /api/.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://bestsaaswebdesigns.com";
const BATCH = 50;

// Its 11 categories; the ones naming a kind of business rather than a product are SaaS.
const INDUSTRY = {
  "ai": "AI",
  "engineering & infrastructure": "Developer tools",
  "finance & commerce": "Finance",
  "productivity & collaboration": "Productivity",
  "data & analytics": "SaaS",
  "design & creative": "SaaS",
  "industry solutions": "SaaS",
  "marketing": "SaaS",
  "people & culture": "SaaS",
  "sales & support": "SaaS",
  "security": "SaaS",
};

export const name = "bestsaaswebdesigns";

// The WebPage object of a /site/<slug> page's JSON-LD.
function sitePage($) {
  for (const el of $("script[type='application/ld+json']").get()) {
    let data;
    try {
      data = JSON.parse($(el).text());
    } catch {
      continue;
    }
    const page = [].concat(data).find((item) => item?.["@type"] === "WebPage" && item.about?.url);
    if (page) return page;
  }
  return null;
}

function siteData(page) {
  const url = page.about.url;
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) return null;
  const category = String(page.name ?? "").split(" — ").pop().replace(/\s+website design breakdown$/i, "").trim().toLowerCase();
  return { url, name: page.about.name?.trim() || null, industryHint: INDUSTRY[category] ?? "SaaS" };
}

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const refs = [...new Set($map("url > loc").map((_, el) => $map(el).text().trim()).get()
    .filter((loc) => /^https:\/\/bestsaaswebdesigns\.com\/site\/[\w-]+$/.test(loc)))];
  if (!refs.length) console.warn(`[${name}] no /site/ pages in the sitemap; its format may have changed`);
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
      const page = sitePage(cheerio.load(html));
      const site = page && siteData(page);
      if (!site) continue;
      yielded++;
      yield { ...site, sourceRef: ref };
    }
  }
}
