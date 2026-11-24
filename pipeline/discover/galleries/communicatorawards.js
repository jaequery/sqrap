// The Communicator Awards (communicatorawards.com), the Academy of Interactive
// & Visual Arts' awards for marketing and communication, on the same winners
// platform as the W3 Awards. Its gallery keeps the two latest seasons; the
// Websites media type, filtered to the top level, the Award of Excellence, holds
// about 100 to 130 winners a season (Snøhetta, SFJAZZ, RIBA, Metra, Philips,
// Colorado.gov, museums, universities), served as HTML about 30 a page. The
// "views" sitemaps name each season's event id and its Websites gallery; each
// card's popup carries a "view project" button straight to the site, and its
// "Websites - General-<category>" line maps to industry. robots.txt allows
// everything but /wp-admin/ and author pages.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

const BASE = "https://www.communicatorawards.com";
const GALLERY = `${BASE}/winners/winners-gallery/`;
const WEBSITES = "40";
const EXCELLENCE = "8";
const MAX_PAGES = 20;

export const name = "communicatorawards";

// "Websites - General-<category>" (lowercased) → lib/taxonomy.js INDUSTRIES.
// Broad categories (Homepage, Government, Corporate Communication, Law & Legal
// Services...) and "Websites - Features-..." craft categories carry no hint.
const INDUSTRY = {
  "non-profit": "Nonprofit",
  "causes & awareness": "Nonprofit",
  "social responsibility": "Nonprofit",
  "school or university": "Education",
  education: "Education",
  "self-promotion": "Agency & Portfolio",
  marketing: "Agency & Portfolio",
  "corporate identity": "Agency & Portfolio",
  "food & drink": "Food & Drink",
  "restaurant & bars": "Food & Drink",
  "medical & pharmaceutical": "Health",
  "health & wellness": "Health",
  fitness: "Health",
  biotechnology: "Health",
  "financial services": "Finance",
  "banking & payments": "Finance",
  insurance: "Finance",
  "web applications & services": "SaaS",
  "travel & tourism": "Travel",
  "hotel & lodging": "Travel",
  "real estate": "Real estate",
  construction: "Architecture & Interior",
  "architecture & design": "Architecture & Interior",
  "arts & entertainment": "Entertainment",
  sports: "Entertainment",
  "cultural institutions": "Media & Publishing",
  news: "Media & Publishing",
  magazine: "Media & Publishing",
  fashion: "Fashion",
  "beauty & cosmetics": "Fashion",
  shopping: "E-commerce",
  "retail & e-commerce": "E-commerce",
  automotive: "Automotive",
  community: "Community & Social",
  music: "Music",
};

// Season event ids with a Websites gallery, newest first, from the "views"
// sitemaps (one per season).
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
      const page = `${GALLERY}?event=${event}&award=${EXCELLENCE}&type=${WEBSITES}&pg=${pg}`;
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
      for (const el of cards.get()) {
        if (yielded >= limit) return;
        const card = $(el);
        const url = String(card.find(".winner-item__popup--buttons a").filter((_, a) => /view project|visit/i.test($(a).text())).first().attr("href") ?? "").trim();
        if (!/^https?:\/\//i.test(url) || /^https?:\/\/([^/]+\.)?(communicatorawards\.com|aiva\.org)\b/i.test(url)) continue;
        const category = text(card.find(".winner-item__category").first().text()).toLowerCase();
        const industryHint = INDUSTRY[category.match(/general-(.+)$/)?.[1]] ?? null;
        yielded++;
        yield {
          url,
          name: text(card.find(".winner-item__title").first().text()) || null,
          industryHint,
          sourceRef: `${GALLERY}?event=${event}&award=${EXCELLENCE}&type=${WEBSITES}&id=${card.attr("id")}`,
        };
      }
    }
  }
}
