// DesignMunk (designmunk.com), "a curated archive of the web's best homepage and
// landing-page design", picked by Mohammad Tajim: about 1,180 entries over some
// 1,060 sites, mostly SaaS, AI, developer tool and fintech products (Hex, Tally,
// Plausible, Pleo, Wrapbook), with a few agencies, shops and studios. It has been
// growing again since August 2026, about 200 entries a month. It was earlier
// recorded as having no outbound site links; the redesigned site links each one
// ("Visit site"), and its entries come from WordPress's public REST API,
// /wp-json/wp/v2/posts, newest first, each with the site's address (acf.site_url)
// and its categories (category-<slug> in class_list). It is read through the
// shared paged loop, 50 entries a request; WordPress answers 400 past the last page,
// which ends the listing. A few entries are a site's pricing page; discovery keeps
// the home page, so they fold into the site. The entry's page is the sourceRef. It
// keeps the normal quality bar (not in CURATED_SOURCES): one curator picks every
// entry, but the picks include pricing pages and small marketing tools, so the judge
// decides. robots.txt disallows only /wp-admin/.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";
import { paged } from "./paged.js";

const BASE = "https://designmunk.com";
const API = `${BASE}/wp-json/wp/v2/posts`;
const PER_PAGE = 50;
const FIELDS = "link,title,class_list,acf.site_url";

export const name = "designmunk";

// Category slug → lib/taxonomy.js INDUSTRIES, most specific first: an entry is
// usually in two categories (AI and Developer Tools, Finance and Fintech, Software
// and Productivity), and the first one listed here wins.
const INDUSTRY = [
  ["developer-tools", "Developer tools"],
  ["ai", "AI"],
  ["fintech", "Finance"],
  ["finance", "Finance"],
  ["ecommerce", "E-commerce"],
  ["health", "Health"],
  ["education", "Education"],
  ["food-drinks", "Food & Drink"],
  ["travel", "Travel"],
  ["real-estate", "Real estate"],
  ["agency", "Agency & Portfolio"],
  ["creative", "Agency & Portfolio"],
  ["entertainment", "Entertainment"],
  ["gaming", "Entertainment"],
  ["productivity", "Productivity"],
  ["analytics", "SaaS"],
  ["design-tool", "SaaS"],
  ["data-infrastructure", "SaaS"],
  ["security", "SaaS"],
  ["human-resources", "SaaS"],
  ["marketing", "SaaS"],
  ["communication", "SaaS"],
  ["software", "SaaS"],
];

const OWN = /(^|\.)designmunk\.com$/i;

export function parse(data) {
  return (Array.isArray(data) ? data : []).map((p) => {
    const raw = typeof p?.acf?.site_url === "string" ? p.acf.site_url.trim() : "";
    if (!raw || typeof p.link !== "string") return null;
    let site;
    try {
      site = new URL(raw);
    } catch {
      return null;
    }
    if (!/^https?:$/.test(site.protocol) || OWN.test(site.hostname)) return null;
    const categories = new Set(
      (p.class_list ?? []).map((c) => /^category-(.+)$/.exec(c)?.[1]).filter(Boolean),
    );
    return {
      url: site.href,
      name: cheerio.load(p.title?.rendered ?? "").text().replace(/\s+/g, " ").trim() || null,
      industryHint: INDUSTRY.find(([slug]) => categories.has(slug))?.[1] ?? null,
      sourceRef: p.link,
    };
  }).filter(Boolean);
}

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 40,
    pageUrl: (n) => `${API}?per_page=${PER_PAGE}&page=${n}&orderby=date&order=desc&_fields=${FIELDS}`,
    // fetchHtml for its robots.txt check; the endpoint answers JSON either way.
    // Past the last page WordPress answers 400 (rest_post_invalid_page_number).
    load: async (url) => {
      try {
        return JSON.parse(await fetchHtml(url));
      } catch (err) {
        if (/HTTP 400\b/.test(err.message)) return [];
        throw err;
      }
    },
    parse,
  });
}
