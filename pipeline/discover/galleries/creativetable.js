// creative table (creativetable.de), a German gallery that adds one hand-picked
// website a day from studios, agencies, brands and startups worldwide (Rolex,
// Wolff Olins, Floema, Evervault, Shopify Editions, Yodezeen...). Its English
// home page (/en/) lists every entry newest first in one request, each card
// linking to a /en/website/<slug>/ detail page and tagged with one category
// (branding, studio, agentur, portfolio, saas, ecommerce, event, app). The
// detail page's "visit" button links out to the site. The sponsor and submit
// cards mixed into the grid carry no detail link and are skipped. robots.txt
// allows everything. Detail pages already stored as a site's sourceRef are not
// fetched again.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://www.creativetable.de";

export const name = "creativetable";

// Its categories, mapped to an industry; branding, event and app say nothing
// about the industry.
const INDUSTRY = {
  studio: "Agency & Portfolio",
  agentur: "Agency & Portfolio",
  portfolio: "Agency & Portfolio",
  saas: "SaaS",
  ecommerce: "E-commerce",
};

export function parse($) {
  const seen = new Set();
  return $("article.card[data-category]").map((_, el) => {
    const card = $(el);
    const href = card.find("a.card-link[href*='/website/']").attr("href");
    if (!href) return null;
    const sourceRef = new URL(href, BASE).href;
    if (seen.has(sourceRef)) return null;
    seen.add(sourceRef);
    return {
      sourceRef,
      name: card.attr("data-name")?.trim() || card.find(".card-label").text().trim() || null,
      industryHint: INDUSTRY[card.attr("data-category")?.toLowerCase()] ?? null,
    };
  }).get().filter(Boolean);
}

export async function* listing({ limit }) {
  const entries = parse(cheerio.load(await fetchHtml(`${BASE}/en/`)));
  if (!entries.length) {
    console.warn(`[${name}] no entries on ${BASE}/en/; the gallery markup may have changed`);
    return;
  }
  const known = await knownSourceRefs(entries.map((e) => e.sourceRef));
  let yielded = 0;
  for (const entry of entries) {
    if (yielded >= limit) return;
    if (known.has(entry.sourceRef)) continue;
    const url = cheerio.load(await fetchHtml(entry.sourceRef))("a#detail-visit[href^='http']").attr("href");
    if (!url) continue;
    yielded++;
    yield { url, name: entry.name, industryHint: entry.industryHint, sourceRef: entry.sourceRef };
  }
}
