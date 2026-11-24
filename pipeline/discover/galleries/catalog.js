// Catalog (catalog.cool/brands), a hand-picked gallery of about 240
// design-led Shopify storefronts: skincare, fashion, homewares, food and drink
// (Dusen Dusen, Areaware, Material Kitchen, Heyday Canning, Huron...), with
// new brands added every week. The brand grid renders client-side, but the
// served /brands page's Next.js flight data carries every brand record (slug,
// title, externalUrl, industry tags, createdAt), so one request reads the whole
// gallery; brands are read newest first and each brand's /brands/<slug> page is
// its sourceRef. The first industry tag that maps to an industry wins, else
// E-commerce, since every entry is a store. robots.txt allows everything but
// account, bookmark and submission pages.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://catalog.cool";
const PAGE = `${BASE}/brands`;

export const name = "catalog";

// Store tags the keyword list misses or would read as software.
const INDUSTRY = {
  home: "Architecture & Interior",
  furniture: "Architecture & Interior",
  decor: "Architecture & Interior",
  lighting: "Architecture & Interior",
  textiles: "Architecture & Interior",
  bedding: "Architecture & Interior",
  beauty: "Health",
  skincare: "Health",
  "skin care": "Health",
  cosmetics: "Health",
  perfume: "Health",
  beverages: "Food & Drink",
  tea: "Food & Drink",
  snacks: "Food & Drink",
  chocolate: "Food & Drink",
  shoes: "Fashion",
  footwear: "Fashion",
  accessories: "Fashion",
  bags: "Fashion",
  tech: "E-commerce",
  travel: "E-commerce",
  electronics: "E-commerce",
  photography: "E-commerce",
};

function industryOf(tags) {
  for (const tag of tags ?? []) {
    const key = String(tag).toLowerCase().trim();
    const industry = INDUSTRY[key] ?? industryFromTags(key);
    if (industry) return industry;
  }
  return "E-commerce";
}

// The page's React Server Components payload: the string chunks pushed to
// self.__next_f, decoded and joined.
function flightData($) {
  return $("script").map((_, el) => {
    const m = /^self\.__next_f\.push\(\[1,("[\s\S]*")\]\)$/.exec($(el).text().trim());
    if (!m) return "";
    try {
      return JSON.parse(m[1]);
    } catch {
      return "";
    }
  }).get().join("");
}

// The JSON object that starts at `start` in `text`, or null.
function objectAt(text, start) {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

// Every brand record in the flight data, once each.
function brands(text) {
  const seen = new Map();
  for (const m of text.matchAll(/\{"id":"[0-9a-f-]{36}","type":"brand","slug":/g)) {
    const brand = objectAt(text, m.index);
    if (brand?.slug && typeof brand.externalUrl === "string" && !seen.has(brand.slug)) seen.set(brand.slug, brand);
  }
  return [...seen.values()];
}

export async function* listing({ limit }) {
  const list = brands(flightData(cheerio.load(await fetchHtml(PAGE))))
    .filter((b) => /^https?:\/\//i.test(b.externalUrl) && !/^https?:\/\/([^/]+\.)?catalog\.cool\b/i.test(b.externalUrl))
    .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
  if (!list.length) console.warn(`[${name}] no brand records on ${PAGE}; the page data may have changed`);
  for (const b of list.slice(0, limit)) {
    yield {
      url: b.externalUrl.trim(),
      name: b.title?.trim() || null,
      industryHint: industryOf(b.industries),
      sourceRef: `${PAGE}/${encodeURIComponent(b.slug)}`,
    };
  }
}
