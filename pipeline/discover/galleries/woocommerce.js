// WooCommerce Showcase (woocommerce.com/showcase), the stores Woo's team picks
// from merchants on its platform: Nutribullet, Grüum, Mandarin Stone, Aunt
// Fannie's, Form Nutrition, Thompson & Hanson. The page renders the first six
// cards and a "Load more" button whose script asks admin-ajax.php
// (wccom_load_more_showcases, 24 cards a request) for the rest with the
// nonce and shuffle seed the grid carries, so about seven requests read the
// whole gallery (about 150 stores). Each card's Visit link goes straight to the
// store, and its tags name the store's vertical and country.
// Verticals that fit lib/taxonomy.js INDUSTRIES map to it (the first that fits,
// in the card's order); the rest (home decor, sports, pets, crafts, ...) fall
// back to E-commerce, as every entry is a store. robots.txt allows /showcase/
// and /wp-admin/admin-ajax.php.
import * as cheerio from "cheerio";
import { allowedByRobots, fetchHtml, fetchJson } from "../http.js";

const BASE = "https://woocommerce.com";
const SHOWCASE = `${BASE}/showcase/`;
const AJAX = `${BASE}/wp-admin/admin-ajax.php`;
const PER_PAGE = 24; // what the endpoint returns at most
const MAX_PAGES = 40;

export const name = "woocommerce";

// Vertical slug → lib/taxonomy.js INDUSTRIES; others fall back to E-commerce.
const INDUSTRY = {
  automotive: "Automotive",
  books: "Media & Publishing",
  "clothing-fashion": "Fashion",
  "cosmetics-personal-care": "Health",
  "food-drink": "Food & Drink",
  "health-fitness": "Health",
  music: "Music",
  "online-learning": "Education",
};

function asSite(href) {
  const url = String(href ?? "").trim();
  if (!/^https?:\/\/[^/]+\.[^/]+/i.test(url)) return null;
  try {
    const u = new URL(url);
    if (/(^|\.)(woocommerce|wordpress|automattic)\.com$/i.test(u.hostname)) return null;
    return u.href;
  } catch {
    return null;
  }
}

function cards($, page) {
  const out = [];
  $("article.wccom-showcase-card").each((_, el) => {
    const card = $(el);
    const visit = card.find("a[data-tracks='showcase_grid_visit_site_click']").first();
    const url = asSite(visit.attr("data-tracks-site_url") ?? visit.attr("href"));
    if (!url) return;
    const id = visit.attr("data-tracks-showcase_id");
    const tags = (type) =>
      card
        .find(`a.wccom-showcase-tag[data-filter-type='${type}']`)
        .map((_, t) => $(t).attr("data-filter-value"))
        .get();
    const industry = tags("vertical").map((v) => INDUSTRY[v]).find(Boolean) ?? "E-commerce";
    const country = tags("country").find((c) => /^[A-Z]{2}$/.test(c)) ?? null;
    out.push({
      url,
      name: card.find(".wccom-showcase-card__title").first().text().trim() || visit.attr("data-tracks-showcase_title")?.trim() || null,
      industryHint: industry,
      countryHint: country,
      sourceRef: id ? `${SHOWCASE}#${id}` : page,
    });
  });
  return out;
}

export async function* listing({ limit }) {
  const $ = cheerio.load(await fetchHtml(SHOWCASE));
  const grid = $(".wccom-showcases-grid").first();
  if (!grid.length) {
    console.warn(`[${name}] no showcase grid on ${SHOWCASE}; the page may have changed`);
    return;
  }
  const seen = new Set();
  let yielded = 0;
  function* fresh(list) {
    for (const store of list) {
      if (yielded >= limit) return;
      const host = new URL(store.url).hostname.replace(/^www\./, "");
      if (seen.has(host)) continue;
      seen.add(host);
      yielded++;
      yield store;
    }
  }
  // The first six cards are on the page; the endpoint's page 1 starts over
  // with 24, so the page's own cards only matter when the endpoint fails.
  const first = cards($, SHOWCASE);
  const nonce = grid.attr("data-nonce");
  const seed = grid.attr("data-seed") ?? "";
  if (!nonce || grid.attr("data-has-more") !== "true") {
    yield* fresh(first);
    return;
  }
  const filters = JSON.stringify({ vertical: "", storeType: "", country: "", extension: "" });
  for (let page = 1; page <= MAX_PAGES && yielded < limit; page++) {
    const params = new URLSearchParams({ action: "wccom_load_more_showcases", page: String(page), perPage: String(PER_PAGE), filters, nonce, seed });
    const url = `${AJAX}?${params}`;
    if (!(await allowedByRobots(url))) {
      console.warn(`[${name}] robots.txt disallows ${AJAX}; reading the page's own cards only`);
      yield* fresh(first);
      return;
    }
    let data;
    try {
      data = await fetchJson(url, { headers: { referer: SHOWCASE } });
    } catch (err) {
      console.warn(`[${name}] stopping at page ${page}: ${err.message}`);
      if (page === 1) yield* fresh(first);
      return;
    }
    if (!data?.success || typeof data.data?.html !== "string") {
      console.warn(`[${name}] load-more answered without cards on page ${page}: ${data?.data?.message ?? "unexpected response"}`);
      if (page === 1) yield* fresh(first);
      return;
    }
    yield* fresh(cards(cheerio.load(data.data.html), SHOWCASE));
    if (!data.data.hasMore) return;
  }
}
