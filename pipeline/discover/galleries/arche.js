// Arche Directory (arche.directory), a hand-picked library of about 285
// landing pages, studio portfolios and personal portfolios, each measured for
// its design system, sections and motion: product, studio and designer sites
// (Notion, WorkOS, ToyFight, Fine Acts...), no paid placement. Its listings
// carry no outbound link, but its sitemap lists every /sites/<slug> page with a
// lastmod, read newest first, so one is fetched per new site; its JSON-LD
// WebPage names the page type ("Notion — Landing page") and its `about`
// WebSite is the site. Studio and personal portfolios are Agency & Portfolio;
// a landing page's industry comes from its first keyword (Productivity, Design
// tools, Fintech...). Pages already stored as a site's sourceRef are not
// fetched again. robots.txt allows everything but /api/ (and AI training bots).
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://arche.directory";
const BATCH = 50;

export const name = "arche";

// The WebPage object of a /sites/<slug> page's JSON-LD.
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
  const kind = String(page.name ?? "").split(" — ").pop().toLowerCase();
  const firstKeyword = String(page.keywords ?? "").split(",")[0].trim();
  return {
    url,
    name: page.about.name?.trim() || null,
    industryHint: /portfolio/.test(kind) ? "Agency & Portfolio" : industryFromTags(firstKeyword),
  };
}

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap-0.xml`), { xml: true });
  const refs = $map("url").map((_, el) => ({
    ref: $map(el).children("loc").first().text().trim(),
    lastmod: $map(el).children("lastmod").first().text().trim(),
  })).get()
    .filter((e) => /^https:\/\/arche\.directory\/sites\/[\w-]+$/.test(e.ref))
    .sort((a, b) => b.lastmod.localeCompare(a.lastmod))
    .map((e) => e.ref);
  if (!refs.length) console.warn(`[${name}] no /sites/ pages in the sitemap; its format may have changed`);
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
