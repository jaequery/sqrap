// The W3 Awards (w3award.com), the Academy of Interactive & Visual Arts' awards
// for web work. Its winners gallery keeps the two latest seasons; the Websites
// media type holds about 360 winners a season, served as HTML 27 a page and
// sorted by award: Best in Show, then Gold, then Silver. Only Best in Show and
// Gold winners are read (about 150 a season: Joby Aviation, Cleveland Museum of
// Art, Smithsonian, Arrowhead, studios and brands), so paging a season stops at
// the first Silver card, after about six pages. The "views" sitemaps name each
// season's event id and its Websites gallery; each card's popup carries a Visit
// button straight to the site, and its "General Websites-<category>" lines map to
// industry. robots.txt allows everything but /wp-admin/ and author pages.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

const BASE = "https://www.w3award.com";
const WEBSITES = "54";
const KEEP = new Set(["best in show", "gold"]);
const MAX_PAGES = 20;

export const name = "w3award";

// "General Websites-<category>" (lowercased) → lib/taxonomy.js INDUSTRIES.
// Broad categories (Website Redesign, Corporate Communications, Law & Legal...)
// and "Website Features-..." craft categories carry no hint.
const INDUSTRY = {
  "non-profit": "Nonprofit",
  "charitable organizations": "Nonprofit",
  "cause awareness": "Nonprofit",
  activism: "Nonprofit",
  associations: "Nonprofit",
  "schools & universities": "Education",
  training: "Education",
  student: "Education",
  "children & youth": "Education",
  "professional services": "Agency & Portfolio",
  consulting: "Agency & Portfolio",
  "self promotion": "Agency & Portfolio",
  branding: "Agency & Portfolio",
  "public relations": "Agency & Portfolio",
  "food & beverage": "Food & Drink",
  restaurant: "Food & Drink",
  "wine, beer, & spirits": "Food & Drink",
  "healthcare services": "Health",
  health: "Health",
  fitness: "Health",
  pharmaceuticals: "Health",
  biotechnology: "Health",
  "shopping & retail": "E-commerce",
  "consumer goods": "E-commerce",
  "real estate": "Real estate",
  "home renovation": "Real estate",
  "architecture & design": "Architecture & Interior",
  construction: "Architecture & Interior",
  "computers & it": "SaaS",
  "web applications & services": "SaaS",
  collaboration: "Productivity",
  "financial services & fintech": "Finance",
  "financial services": "Finance",
  "banking & payments": "Finance",
  insurance: "Finance",
  tourism: "Travel",
  travel: "Travel",
  "hotel & lodging": "Travel",
  "arts & culture": "Media & Publishing",
  "cultural institutions": "Media & Publishing",
  news: "Media & Publishing",
  magazine: "Media & Publishing",
  publishing: "Media & Publishing",
  music: "Music",
  entertainment: "Entertainment",
  television: "Entertainment",
  "movie & film": "Entertainment",
  "performing arts": "Entertainment",
  sports: "Entertainment",
  "fashion & beauty": "Fashion",
  "beauty & cosmetics": "Fashion",
  automotive: "Automotive",
  community: "Community & Social",
};

// Season event ids with a Websites gallery, newest first, from the "views"
// sitemaps (one per season, newest listed first).
async function seasons() {
  const $index = cheerio.load(await fetchHtml(`${BASE}/sitemap_index.xml`), { xml: true });
  const maps = $index("sitemap > loc").map((_, el) => $index(el).text().trim()).get()
    .map((u) => ({ u, year: Number(u.match(/\/rm-winners-views-(\d{4})-sitemap\.xml$/)?.[1]) }))
    .filter((m) => m.year)
    .sort((a, b) => b.year - a.year);
  const events = [];
  for (const { u } of maps) {
    let xml;
    try {
      xml = await fetchHtml(u);
    } catch (err) {
      console.warn(`[${name}] skipping ${u}: ${err.message}`);
      continue;
    }
    const $ = cheerio.load(xml, { xml: true });
    for (const loc of $("url > loc").map((_, el) => $(el).text().trim()).get()) {
      const q = new URL(loc, BASE).searchParams;
      if (q.get("type") === WEBSITES && q.get("event") && !events.includes(q.get("event"))) events.push(q.get("event"));
    }
  }
  return events;
}

const text = (s) => s.replace(/\s+/g, " ").trim();

export async function* listing({ limit }) {
  const events = await seasons();
  if (!events.length) console.warn(`[${name}] no Websites galleries in the winners sitemaps; their format may have changed`);
  let yielded = 0;
  for (const event of events) {
    for (let pg = 1; pg <= MAX_PAGES; pg++) {
      if (yielded >= limit) return;
      const page = `${BASE}/winners/gallery/?event=${event}&type=${WEBSITES}&pg=${pg}`;
      let html;
      try {
        html = await fetchHtml(page);
      } catch (err) {
        console.warn(`[${name}] skipping ${page}: ${err.message}`);
        break;
      }
      const $ = cheerio.load(html);
      const cards = $(".winner-item[id]");
      if (!cards.length) {
        if (pg === 1) console.warn(`[${name}] no winner cards on ${page}; the markup may have changed`);
        break;
      }
      let past = false;
      for (const el of cards.get()) {
        const card = $(el);
        const award = text(card.find(".winner-item__badge img").attr("alt") ?? "").toLowerCase();
        if (!KEEP.has(award)) {
          past = true;
          break;
        }
        if (yielded >= limit) return;
        const url = String(card.find(".winner-item__popup--buttons a").filter((_, a) => /visit/i.test($(a).text())).first().attr("href") ?? "").trim();
        if (!/^https?:\/\//i.test(url) || /^https?:\/\/([^/]+\.)?(w3award\.com|aiva\.org)\b/i.test(url)) continue;
        const categories = (card.find(".winner-item__category").html() ?? "")
          .split(/<[^>]+>/).map((s) => cheerio.load(s).text().trim().toLowerCase()).filter(Boolean);
        const industryHint = categories
          .map((c) => c.match(/^general websites-(.+)$/)?.[1]).filter(Boolean)
          .map((c) => INDUSTRY[c]).find(Boolean) ?? null;
        yielded++;
        yield {
          url,
          name: text(card.find(".winner-item__title").first().text()) || null,
          industryHint,
          sourceRef: `${BASE}/winners/gallery/?event=${event}&type=${WEBSITES}&id=${card.attr("id")}`,
        };
      }
      if (past) break;
    }
  }
}
