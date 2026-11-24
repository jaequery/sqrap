// BigCommerce Showcase (bigcommerce.com/showcase), the storefronts BigCommerce's
// team picks from the brands on its platform: Tiffany & Co. Australia, Leica,
// Zeiss, Mizuno, Yeti Cycles, GE Appliances, MEC, Harvard Business Review,
// Wilson Audio. The page and each of its category pages (luxury, fashion,
// home and garden, headless, B2B, ...) are server-rendered with their whole
// feed in __NEXT_DATA__, and every entry's externalUrl links straight to the
// store, so one request per category reads the gallery (about 250 stores), all
// of them before the first is yielded.
// The featured feed on /showcase/ comes first, then the categories in the
// order the page links them. Industry categories map to industry; the rest
// (headless, B2B, multi-storefront, store-based retailers) default to
// E-commerce, as every entry is a store. robots.txt allows /showcase/.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

const BASE = "https://www.bigcommerce.com";
const SHOWCASE = `${BASE}/showcase/`;

export const name = "bigcommerce";

// Category slug → lib/taxonomy.js INDUSTRIES; others fall back to E-commerce.
const INDUSTRY = {
  automotive: "Automotive",
  "education-publishing": "Education",
  "fashion-apparel": "Fashion",
  "food-beverage": "Food & Drink",
  "health-beauty": "Health",
  "travel-and-entertainment": "Travel",
};

// A page's showcase entries, read from the SWR fallback in __NEXT_DATA__.
function entries($) {
  let data;
  try {
    data = JSON.parse($("script#__NEXT_DATA__").first().text());
  } catch {
    return null;
  }
  const fallback = data?.props?.pageProps?.fallback ?? {};
  const key = Object.keys(fallback).find((k) => k.startsWith("showcaseFeed:"));
  return key ? (fallback[key]?.showcaseCollection?.items ?? []) : null;
}

function asSite(href) {
  const url = String(href ?? "").trim();
  if (!/^https?:\/\/[^/]+\.[^/]+/i.test(url)) return null;
  try {
    const u = new URL(url);
    if (/(^|\.)bigcommerce\./i.test(u.hostname)) return null;
    return u.href;
  } catch {
    return null;
  }
}

// Category slugs in the order the showcase page links them.
function categories($) {
  const slugs = [];
  $("a[href]").each((_, a) => {
    const m = String($(a).attr("href")).match(/^(?:https:\/\/www\.bigcommerce\.com)?\/showcase\/([a-z0-9-]+)\/?$/);
    if (m && !slugs.includes(m[1])) slugs.push(m[1]);
  });
  return slugs;
}

export async function* listing({ limit }) {
  const $home = cheerio.load(await fetchHtml(SHOWCASE));
  const pages = [{ slug: null, page: SHOWCASE, $: $home }, ...categories($home).map((slug) => ({ slug, page: `${SHOWCASE}${slug}/` }))];
  // Every feed is read before anything is yielded (one request per category),
  // so a featured store still gets the industry of the category it is filed in.
  const stores = new Map();
  let read = 0;
  for (const p of pages) {
    if (stores.size >= limit && !INDUSTRY[p.slug]) continue;
    let $ = p.$;
    if (!$) {
      try {
        $ = cheerio.load(await fetchHtml(p.page));
      } catch (err) {
        console.warn(`[${name}] skipping ${p.page}: ${err.message}`);
        continue;
      }
    }
    const items = entries($);
    if (!items) {
      console.warn(`[${name}] no showcase feed on ${p.page}; the page may have changed`);
      continue;
    }
    read++;
    for (const item of items) {
      const url = asSite(item?.externalUrl?.url);
      if (!url) continue;
      const host = new URL(url).hostname.replace(/^www\./, "");
      const known = stores.get(host);
      if (known) {
        known.industryHint ??= INDUSTRY[p.slug] ?? null;
        continue;
      }
      stores.set(host, {
        url,
        name: String(item.title ?? "").trim() || null,
        industryHint: INDUSTRY[p.slug] ?? null,
        sourceRef: item.slug ? `${p.page}#${encodeURIComponent(item.slug)}` : p.page,
      });
    }
  }
  if (!read) console.warn(`[${name}] no showcase feeds under ${SHOWCASE}; the site may have changed`);
  let yielded = 0;
  for (const store of stores.values()) {
    if (yielded >= limit) return;
    yielded++;
    yield { ...store, industryHint: store.industryHint ?? "E-commerce" };
  }
}
