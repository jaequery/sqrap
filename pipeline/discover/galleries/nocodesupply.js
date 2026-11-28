// No-Code Supply Co. (nocodesupply.co), Corey Moen's hand-picked directory of
// inspiring websites, apps, code snippets and tools since 2019. Its Website type,
// about 1,650 entries, is a gallery of sites mostly built with Webflow and GSAP:
// SaaS and AI products, designer and studio portfolios, nonprofits, climate,
// real estate and food brands (Ponder, Flockler, Legartis, Abatable, The Audacious
// Project, Malala Fund), with a few picks most months in 2026. The served pages
// show 24 items each and page with ?page=, which its robots.txt disallows
// (Disallow: /*?), so the HTML reaches only the newest picks. Its content lives
// in a public Sanity dataset (project fa171tla, the one its card images come from
// on cdn.sanity.io) that answers GROQ queries without a key, so the items are read
// from Sanity's API CDN: items whose primary type is Website, newest first, 100 a
// request, through the shared paged loop. Items whose second type is Website are
// apps, tools and directories (Typeform, folk, Lemon Squeezy) and are not read.
// Its links carry ?ref=nocodesupply.co, which is dropped. A link deep inside a
// shared host (x.webflow.io/page) is skipped, as that host's root is someone else's
// page; a deep page on a site's own domain folds into the home page, as discovery
// keeps only that. Industries map to lib/taxonomy.js. The item page,
// /item/<slug>, is the sourceRef. It keeps the normal quality bar (not in
// CURATED_SOURCES): many early picks are template-like Webflow sites, so the judge
// decides. robots.txt on nocodesupply.co allows /item/ pages.
import { getDomain } from "tldts";
import { fetchHtml } from "../http.js";
import { paged } from "./paged.js";

const BASE = "https://www.nocodesupply.co";
const API = "https://fa171tla.apicdn.sanity.io/v2023-05-03/data/query/production";
const PER_PAGE = 100;

export const name = "nocodesupply";

// Its industry slugs → lib/taxonomy.js INDUSTRIES, most specific first: an item
// usually has two (AI and SAAS, Creative and No-code), and the first one listed
// here wins.
const INDUSTRY = [
  ["dev-tools", "Developer tools"],
  ["ai", "AI"],
  ["web3", "Crypto"],
  ["financial", "Finance"],
  ["venture-capital", "Finance"],
  ["insurance", "Finance"],
  ["health-wellness", "Health"],
  ["medical", "Health"],
  ["biotech-life-sciences", "Health"],
  ["education", "Education"],
  ["retail-ecommerce", "E-commerce"],
  ["fashion", "Fashion"],
  ["beauty", "Fashion"],
  ["food-beverage", "Food & Drink"],
  ["travel", "Travel"],
  ["hospitality", "Travel"],
  ["real-estate", "Real estate"],
  ["architecture", "Architecture & Interior"],
  ["interior-design", "Architecture & Interior"],
  ["editorial", "Media & Publishing"],
  ["music", "Music"],
  ["film", "Entertainment"],
  ["gaming", "Entertainment"],
  ["entertainment", "Entertainment"],
  ["nonprofit", "Nonprofit"],
  ["collaboration", "Productivity"],
  ["office", "Productivity"],
  ["community", "Community & Social"],
  ["social-media", "Community & Social"],
  ["creator-economy", "Community & Social"],
  ["type-foundry", "Agency & Portfolio"],
  ["public-relations", "Agency & Portfolio"],
  ["creative", "Agency & Portfolio"],
  ["saas", "SaaS"],
  ["no-code", "SaaS"],
  ["hr", "SaaS"],
  ["security", "SaaS"],
  ["it", "SaaS"],
];

const OWN = /(^|\.)nocodesupply\.co$/i;

// The GROQ query for page `n` (1-based): Website items, newest first, with a
// stable tiebreak so pages do not overlap.
export function query(n) {
  const start = (n - 1) * PER_PAGE;
  return (
    `*[_type == "item" && type->slug.current == "website" && defined(url) && defined(slug.current) && !(_id in path("drafts.**"))]` +
    ` | order(date desc, _id asc) [${start}...${start + PER_PAGE}]` +
    ` { title, url, "slug": slug.current, "industries": industries[]->slug.current }`
  );
}

export const pageUrl = (n) => `${API}?query=${encodeURIComponent(query(n))}`;

export function parse(data) {
  const items = Array.isArray(data?.result) ? data.result : [];
  return items.map((item) => {
    if (typeof item?.url !== "string" || typeof item.slug !== "string") return null;
    let site;
    try {
      // A few links carry a second "?" (…?utm_source=twitter?ref=nocodesupply.co).
      site = new URL(item.url.trim().replace(/[?&]ref=nocodesupply\.co\b.*$/i, ""));
    } catch {
      return null;
    }
    if (!/^https?:$/.test(site.protocol) || OWN.test(site.hostname)) return null;
    const host = site.hostname.replace(/^www\./, "");
    const hosted = getDomain(host, { allowPrivateDomains: true }) !== getDomain(host);
    if (hosted && site.pathname.replace(/\/+$/, "")) return null;
    const industries = new Set(Array.isArray(item.industries) ? item.industries : []);
    return {
      url: site.href,
      name: typeof item.title === "string" ? item.title.replace(/\s+/g, " ").trim() || null : null,
      industryHint: INDUSTRY.find(([slug]) => industries.has(slug))?.[1] ?? null,
      sourceRef: `${BASE}/item/${encodeURIComponent(item.slug)}`,
    };
  }).filter(Boolean);
}

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 40,
    pageUrl,
    // fetchHtml for its robots.txt check; Sanity answers JSON either way.
    load: async (url) => JSON.parse(await fetchHtml(url)),
    parse,
  });
}
