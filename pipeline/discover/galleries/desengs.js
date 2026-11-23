// DesEngs (desengs.com), a resource site for design engineers with a
// hand-picked gallery of product, studio and brand sites (Studio Linear, Neon,
// works.studio, SSENSE...) and a separate page of studio and designer
// portfolios. /inspiration/ lists every dated entry its sitemap carries, and
// /inspiration/portfolios/ every portfolio, so the adapter reads just those two
// pages: each card links straight out to the site, beside a link to its detail
// page, which becomes the sourceRef. Portfolios are tagged Agency & Portfolio.
// Sponsored cards (links to curation.systems) carry no detail link and are
// skipped. Its minimal-sites directory (/minimum/) is left out: mostly small
// personal pages.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

const BASE = "https://desengs.com";
const PAGES = [
  { path: "/inspiration/", detail: /^\/inspiration\/\d{4}-\d{2}-\d{2}-[^/]+\/?$/ },
  { path: "/inspiration/portfolios/", detail: /^\/inspiration\/portfolios\/\d{4}-\d{2}-\d{2}-[^/]+\/?$/, industryHint: "Agency & Portfolio" },
];

export const name = "desengs";

export async function* listing({ limit }) {
  const seen = new Set();
  let yielded = 0;
  for (const page of PAGES) {
    if (yielded >= limit) return;
    const $ = cheerio.load(await fetchHtml(`${BASE}${page.path}`));
    const cards = $("a[href^='/inspiration/']").filter((_, el) => page.detail.test($(el).attr("href"))).get();
    if (!cards.length) console.warn(`[${name}] no site cards on ${page.path}; the gallery markup may have changed`);
    for (const el of cards) {
      const info = $(el).next();
      const url = info.find("a[href^='http']").first().attr("href");
      if (!url || seen.has(url)) continue;
      seen.add(url);
      if (yielded >= limit) return;
      yielded++;
      yield {
        url,
        name: info.find("p").first().text().trim() || null,
        industryHint: page.industryHint ?? null,
        sourceRef: new URL($(el).attr("href").replace(/\/?$/, "/"), BASE).href,
      };
    }
  }
}
