// Ecomgallery (ecomgallery.com), "curating only the best eCommerce designs": a
// hand-picked gallery of about 120 brand stores (Mulberry, Oura, Truewerk,
// Wimp Decaf...), filed by product category. It is a WordPress site whose
// `gallery` posts are read newest first from the REST API, 100 a request, so
// the whole gallery takes two requests: each post's content is a "Visit Site"
// button linking straight to the store, so no post page is fetched. The
// product category ids are mapped to an industry, else E-commerce, since every
// entry is a store. robots.txt allows everything.
import * as cheerio from "cheerio";
import { fetchJson } from "../http.js";

const API = "https://ecomgallery.com/wp-json/wp/v2/gallery";
const PER_PAGE = 100;
const MAX_PAGES = 10;

export const name = "ecomgallery";

// Ecomgallery category id → lib/taxonomy.js INDUSTRIES.
const INDUSTRY = {
  14: "Fashion", // accessories
  15: "Fashion", // fashion
  10: "Health", // beauty and personal care
  7: "Food & Drink", // food and beverage
  11: "Architecture & Interior", // interior
};

// The "Visit Site" button's link in a post's rendered content.
function visitLink(html) {
  const $ = cheerio.load(html ?? "");
  const a = $("a[href^='http']").filter((_, el) => /visit site/i.test($(el).text())).first();
  const href = a.attr("href")?.trim();
  if (!href || /^https?:\/\/([^/]+\.)?ecomgallery\.com\b/i.test(href)) return null;
  return href;
}

export async function* listing({ limit }) {
  let yielded = 0;
  for (let page = 1; page <= MAX_PAGES && yielded < limit; page++) {
    const posts = await fetchJson(`${API}?per_page=${PER_PAGE}&page=${page}&orderby=date&order=desc&_fields=link,title,categories,content`);
    if (!Array.isArray(posts) || !posts.length) {
      if (page === 1) console.warn(`[${name}] no posts from ${API}; its API may have changed`);
      return;
    }
    for (const p of posts) {
      if (yielded >= limit) return;
      const url = visitLink(p?.content?.rendered);
      if (!url || typeof p.link !== "string") continue;
      yielded++;
      yield {
        url,
        name: cheerio.load(p.title?.rendered ?? "").text().trim() || null,
        industryHint: (p.categories ?? []).map((id) => INDUSTRY[id]).find(Boolean) ?? "E-commerce",
        sourceRef: p.link,
      };
    }
    if (posts.length < PER_PAGE) return;
  }
}
