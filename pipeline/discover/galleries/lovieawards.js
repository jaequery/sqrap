// The Lovie Awards (winners.lovieawards.com), Europe's internet awards from the
// International Academy of Digital Arts and Sciences, the academy behind the
// Webbys. Its winners gallery keeps the two latest seasons (2025 and 2026; older
// years redirect to the home page), about 130 Gold, Silver and Bronze website
// winners, both general and craft categories: studios, cultural institutions,
// brands and products (Koto, Active Theory, AREA 17, Base Design, Qonto,
// Nordiska museet, ElevenLabs...). The sitemap index has one winners sitemap per
// season; their detail URLs name the website category groups, and each group's
// /all/ page holds every winner card with its "Launch Project" link straight to
// the site, under a heading naming the category, mapped to industry. Seasons are
// read newest first, so about four pages cover the gallery. Email newsletter
// winners are skipped. robots.txt allows everything but /wp-admin/.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

const BASE = "https://winners.lovieawards.com";
const GROUP = /\/categories\/details\/(\d{4})\/websites-mobile-sites\/([a-z0-9-]+)\//;

export const name = "lovieawards";

// Category heading (lowercased) → lib/taxonomy.js INDUSTRIES. Craft categories
// (Best Home Page, Best User Experience...) and broad ones (Art, Events,
// Corporate Communications, Weird...) carry no hint.
const INDUSTRY = {
  activism: "Nonprofit",
  "architecture, interiors & home": "Architecture & Interior",
  "charitable & non-profit organisations": "Nonprofit",
  "charitable organisations & non-profit": "Nonprofit",
  "social impact": "Nonprofit",
  education: "Education",
  "school/university": "Education",
  "schools & education": "Education",
  entertainment: "Entertainment",
  "lifestyle & entertainment": "Entertainment",
  "fashion, style & beauty": "Fashion",
  "fashion & beauty": "Fashion",
  "financial services & banking": "Finance",
  "food & drink": "Food & Drink",
  "food & beverage": "Food & Drink",
  "health & fitness": "Health",
  "news & politics": "Media & Publishing",
  "professional services & self-promotion": "Agency & Portfolio",
  "shopping & retail": "E-commerce",
  "retail & shopping": "E-commerce",
  "travel & lifestyle": "Travel",
  "travel & tourism": "Travel",
  "web services & applications": "SaaS",
  "software & applications": "SaaS",
};

const SKIP = new Set(["email newsletter"]);

// Website category groups per season, newest season first, from the winners
// sitemaps' detail URLs.
async function groups() {
  const $index = cheerio.load(await fetchHtml(`${BASE}/sitemap_index.xml`), { xml: true });
  const maps = $index("sitemap > loc").map((_, el) => $index(el).text().trim()).get().filter((u) => /\/rm-winners-\d{4}-\d+-sitemap\.xml$/.test(u));
  const found = new Map();
  for (const map of maps) {
    let xml;
    try {
      xml = await fetchHtml(map);
    } catch (err) {
      console.warn(`[${name}] skipping ${map}: ${err.message}`);
      continue;
    }
    const $ = cheerio.load(xml, { xml: true });
    for (const loc of $("url > loc").map((_, el) => $(el).text().trim()).get()) {
      const m = loc.match(GROUP);
      if (m) found.set(`${m[1]}/${m[2]}`, Number(m[1]));
    }
  }
  // General categories before craft ones within a season, so a site that won
  // both is first seen with its industry.
  const general = (key) => (/general/.test(key) ? 0 : 1);
  return [...found]
    .sort((a, b) => b[1] - a[1] || general(a[0]) - general(b[0]))
    .map(([key]) => `${BASE}/categories/${key.replace("/", "/websites-mobile-sites/")}/all/`);
}

export async function* listing({ limit }) {
  const pages = await groups();
  if (!pages.length) console.warn(`[${name}] no website categories in the winners sitemaps; their format may have changed`);
  let yielded = 0;
  for (const page of pages) {
    if (yielded >= limit) return;
    let html;
    try {
      html = await fetchHtml(page);
    } catch (err) {
      console.warn(`[${name}] skipping ${page}: ${err.message}`);
      continue;
    }
    const $ = cheerio.load(html);
    const cards = $(".categories-group .card-item[id^='w']");
    if (!cards.length) console.warn(`[${name}] no winner cards on ${page}; the markup may have changed`);
    for (const el of cards.get()) {
      if (yielded >= limit) return;
      const card = $(el);
      const category = card.closest(".categories-group").find(".categories-group__title").first().text().replace(/\s+/g, " ").trim().toLowerCase();
      if (SKIP.has(category)) continue;
      const url = String(card.find("a.btn").filter((_, a) => /launch project/i.test($(a).text())).first().attr("href") ?? "").trim();
      if (!/^https?:\/\//i.test(url) || /\.pdf(?:$|[?#])/i.test(url) || /^https?:\/\/([^/]+\.)?lovieawards\.com\b/i.test(url)) continue;
      yielded++;
      yield {
        url,
        name: card.find(".detail-description__name").first().text().replace(/\s+/g, " ").trim() || card.find(".card-item__title").first().text().replace(/\s+/g, " ").trim() || null,
        industryHint: INDUSTRY[category] ?? null,
        sourceRef: `${page}#${card.attr("id")}`,
      };
    }
  }
}
