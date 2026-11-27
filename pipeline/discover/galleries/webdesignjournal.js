// Webdesign Journal's website gallery (webdesign-journal.de/websites/), "die
// größte Sammlung der schönsten deutschen Websites": about 870 sites picked by
// the editors of the Leipzig agency Hahnsinn since 2013, mostly from Germany,
// Austria and Switzerland: company and brand sites, agencies and studios,
// theatres, universities and other portals, portfolios and a few shops (On,
// ottonova, UdK Berlin, Staatstheater Mainz). It was earlier recorded as having no
// site links in the served HTML: the gallery is rendered client-side by the
// Astra Portfolio plugin, but its entries come from WordPress's public REST API,
// /wp-json/wp/v2/astra-portfolio, newest first, and each carries the site's
// address (astra-site-url) and its categories. It is read through the shared
// paged loop, 50 entries a request; WordPress answers 400 past the last page,
// which ends the listing. The Agentur, Portfolio, Shop and Blog categories map to
// an industry (the rest are colours, Corporate, Portal and One Pager), and
// German, Austrian, Swiss and Liechtenstein domains hint their country. The
// entry's /website-galerie/<slug>/ page is the sourceRef. Hahnsinn's own sites
// are skipped. It keeps the normal quality bar (not in CURATED_SOURCES): its picks
// include many small local businesses, so the judge decides. robots.txt disallows
// only /wp-admin/.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";
import { paged } from "./paged.js";

const BASE = "https://www.webdesign-journal.de";
const API = `${BASE}/wp-json/wp/v2/astra-portfolio`;
const PER_PAGE = 50;
const FIELDS = "link,title,class_list,astra-site-url";

export const name = "webdesignjournal";

// Category slug (from class_list, astra-portfolio-categories-<slug>) →
// lib/taxonomy.js INDUSTRIES.
const INDUSTRY = {
  agentur: "Agency & Portfolio",
  portfolio: "Agency & Portfolio",
  shop: "E-commerce",
  blog: "Media & Publishing",
};

// Top-level domains that name a country (the city and state ones included).
const COUNTRY = { de: "DE", berlin: "DE", nrw: "DE", hamburg: "DE", bayern: "DE", at: "AT", tirol: "AT", wien: "AT", ch: "CH", li: "LI" };

const OWN = /(^|\.)(webdesign-journal\.de|hahnsinn\.de)$/i;

export function parse(data) {
  return (Array.isArray(data) ? data : []).map((p) => {
    const raw = typeof p?.["astra-site-url"] === "string" ? p["astra-site-url"].trim() : "";
    if (!raw || typeof p.link !== "string") return null;
    let site;
    try {
      site = new URL(raw);
    } catch {
      return null;
    }
    if (!/^https?:$/.test(site.protocol) || OWN.test(site.hostname)) return null;
    const categories = (p.class_list ?? [])
      .map((c) => /^astra-portfolio-categories-(.+)$/.exec(c)?.[1])
      .filter(Boolean);
    return {
      url: site.href,
      name: cheerio.load(p.title?.rendered ?? "").text().replace(/\s+/g, " ").trim() || null,
      industryHint: categories.map((c) => INDUSTRY[c]).find(Boolean) ?? null,
      countryHint: COUNTRY[site.hostname.split(".").pop().toLowerCase()] ?? null,
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
