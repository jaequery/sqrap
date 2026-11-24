// UI Sections (uisections.com), a library of about 2,100 website sections
// (heroes, pricing, features, footers) from about 260 SaaS and startup sites
// (11x, Attio, Linear, Vanta...). Its sitemap lists every /companies/<slug>/
// page; the listings link only to those pages, so one is fetched per new site
// for its "Website" fact (a ?ref=uisections.com link; normalizing drops the
// query). Pages already stored as a site's sourceRef are not fetched again. The
// first listed industry that maps wins, else SaaS, since every entry is a
// software or startup site. robots.txt allows everything.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://uisections.com";
const BATCH = 50;
const SITE_PAGE = /^https:\/\/uisections\.com\/companies\/[^/?#]+\/$/;

export const name = "uisections";

// Industries without an entry (customer-support, cybersecurity, data-analytics, design-tools,
// hr, legal, logistics, sales-marketing) fall back to SaaS.
const INDUSTRY_BY_SLUG = {
  agencies: "Agency & Portfolio",
  ai: "AI",
  crypto: "Crypto",
  "developer-tools": "Developer tools",
  ecommerce: "E-commerce",
  education: "Education",
  fintech: "Finance",
  healthcare: "Health",
  productivity: "Productivity",
};

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap-0.xml`), { xml: true });
  const refs = [...new Set($map("loc").map((_, el) => $map(el).text().trim()).get().filter((u) => SITE_PAGE.test(u)))];
  if (!refs.length) console.warn(`[${name}] no /companies/ pages in the sitemap; its format may have changed`);
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
      const row = $(".fact-row").filter((_, el) => $(el).find("dt").text().trim() === "Website").first();
      const url = row.find("a[href^='http']").first().attr("href")?.trim();
      if (!url || /^https?:\/\/([^/]+\.)?uisections\.com\b/i.test(url)) continue;
      const industry = $("dd.inds a[href^='/industries/']").map((_, a) => $(a).attr("href").split("/")[2]).get()
        .map((slug) => INDUSTRY_BY_SLUG[slug]).find(Boolean) ?? "SaaS";
      yielded++;
      yield {
        url,
        name: $("h1").first().text().replace(/\s+website design\s*$/i, "").replace(/\s+/g, " ").trim() || null,
        industryHint: industry,
        sourceRef: ref,
      };
    }
  }
}
