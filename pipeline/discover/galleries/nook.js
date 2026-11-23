// NOOK (nookref.com), a Korean website reference library of about 4,900 sites
// filed by industry and purpose since May 2026: Korean brand, finance,
// real-estate and education sites plus overseas studios and products (Goodpatch,
// Orgnzm Studio, The Pokémon Company...). Its listings are client-rendered and
// carry no outbound link, but its sitemap lists every /site/<id> page newest
// first, so one is fetched per new site; its JSON-LD names the site (WebPage
// url) and its industry (the second breadcrumb, /<industry>). Pages already
// stored as a site's sourceRef are not fetched again. Recruiting sites
// (채용, 採用) are skipped, as they are mostly careers subpages of corporate
// sites. robots.txt allows everything but accounts, bookmarks and /api.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://nookref.com";
const BATCH = 50;

export const name = "nook";

// NOOK industry slug → lib/taxonomy.js INDUSTRIES. lifestyle, pet, legal and
// etc carry no hint; finance also covers real estate.
const INDUSTRY = {
  beauty: "Health",
  fashion: "Fashion",
  fnb: "Food & Drink",
  medical: "Health",
  education: "Education",
  it: "SaaS",
  interior: "Architecture & Interior",
  travel: "Travel",
  finance: "Finance",
};

// The WebPage and BreadcrumbList objects of a /site/<id> page's JSON-LD.
function siteData($) {
  let page = null;
  let crumbs = null;
  for (const el of $("script[type='application/ld+json']").get()) {
    let data;
    try {
      data = JSON.parse($(el).text());
    } catch {
      continue;
    }
    for (const item of [].concat(data)) {
      if (item?.["@type"] === "WebPage" && !page) page = item;
      if (item?.["@type"] === "BreadcrumbList" && !crumbs) crumbs = item;
    }
  }
  if (!page) return null;
  const section = crumbs?.itemListElement?.find((c) => c?.position === 2)?.item;
  const slug = typeof section === "string" && section.startsWith(BASE) ? new URL(section).pathname.split("/")[1] : null;
  return { url: page.url, name: page.name?.trim() || null, industryHint: INDUSTRY[slug] ?? null };
}

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const refs = $map("loc").map((_, el) => $map(el).text().trim()).get()
    .filter((loc) => /^https:\/\/nookref\.com\/site\/[0-9a-f-]{36}$/.test(loc));
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
      const site = siteData(cheerio.load(html));
      if (!site || typeof site.url !== "string" || !/^https?:\/\//.test(site.url)) continue;
      if (/채용|採用/.test(site.name ?? "")) continue;
      yielded++;
      yield { ...site, sourceRef: ref };
    }
  }
}
