// Pagedone Inspiration (pagedone.io/inspiration), the page library of the Pagedone
// Tailwind UI kit: about 1,400 full-page screenshots from about 370 real sites, most of
// them SaaS and startup products (SavvyCal, Dovetail, Runway, Tally, Uniswap, Checkr)
// plus some studios, shops and portfolios, each site's landing page next to its
// pricing, about, careers, login and blog pages, updated through November 2026.
// The gallery and each of its category pages answer `?page=<n>` with
// `X-Requested-With: XMLHttpRequest` as JSON { html, next_page }: eight cards, newest
// first, each a link to /inspiration/detail/<slug> and a link straight to the page.
// Only a site's landing page (a link to a host's root) is taken, about 330 sites; its subpages repeat
// the site, and many sit on hosted job boards or help centres. A link to a subdomain
// (app., get., about.) stands for its registrable domain. Industry categories are read
// first (about 30 requests) for a hint, matched to a site by its registrable domain, so
// a category that files only its pricing page still names its industry; the big saas, digital-product and technology
// categories are skipped, since they say no more than the gallery as a whole.
// robots.txt allows every page.
import * as cheerio from "cheerio";
import { allowedByRobots, fetchJson } from "../http.js";
import { candidateDomain } from "../normalize.js";

const BASE = "https://pagedone.io/inspiration";
const MAX_PAGES = 400;

export const name = "pagedone";

// Category slug → lib/taxonomy.js INDUSTRIES, most specific first.
const INDUSTRY = [
  ["Accommodation", "Travel"],
  ["real-estate", "Real estate"],
  ["non-profit", "Nonprofit"],
  ["fashion", "Fashion"],
  ["Health", "Health"],
  ["course", "Education"],
  ["Book", "Media & Publishing"],
  ["Game", "Entertainment"],
  ["event", "Entertainment"],
  ["nft", "Crypto"],
  ["Crypto", "Crypto"],
  ["Accounting", "Finance"],
  ["fintech", "Finance"],
  ["finance", "Finance"],
  ["artifical-intelligence", "AI"],
  ["e-commerce", "E-commerce"],
  ["store", "E-commerce"],
  ["physical-product", "E-commerce"],
  ["Agency", "Agency & Portfolio"],
  ["portfolio", "Agency & Portfolio"],
  ["freelance", "Agency & Portfolio"],
  ["Crm", "SaaS"],
  ["Analytics", "SaaS"],
];

// Hosts that carry a site's careers or help pages, never the site itself.
const NOT_THE_SITE = /(^|\.)(homerun\.co|teamtailor\.com|zohorecruit\.com|greenhouse\.io|workable\.com|bamboohr\.com|freshteam\.com|intercom\.help|notion\.site|medium\.com|shorturl\.at)$/i;

// One page of cards: [{ slug, url }] in the page's order.
export function parseCards(html) {
  const $ = cheerio.load(html);
  const cards = [];
  $("a[href*='/inspiration/detail/']").each((_, a) => {
    const slug = $(a).attr("href").match(/\/inspiration\/detail\/([^/?#"]+)/)?.[1];
    const link = $(a).closest("div.group").find("a[href^='http']").filter((_, b) => !/pagedone\.io/i.test($(b).attr("href"))).first().attr("href");
    if (slug && link) cards.push({ slug, url: link.trim() });
  });
  return cards;
}

// The landing page a card links to, as the site URL to yield; null for a subpage,
// a hosted job board or anything that is not an http(s) link.
export function siteUrl(href) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol) || !/^\/?$/.test(url.pathname) || NOT_THE_SITE.test(url.hostname)) return null;
  const host = url.hostname.replace(/^www\./, "");
  const domain = candidateDomain(href);
  if (!domain) return null;
  return host === domain ? `https://${url.hostname}/` : `https://${domain}/`;
}

async function* pages(path) {
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await fetchJson(`${BASE}${path}?page=${page}`, { headers: { "x-requested-with": "XMLHttpRequest" } });
    const cards = parseCards(data?.html ?? "");
    if (!cards.length) return;
    yield cards;
    if (!data.next_page) return;
  }
}

export async function* listing({ limit }) {
  if (!(await allowedByRobots(BASE))) {
    console.warn(`[${name}] robots.txt disallows ${BASE}`);
    return;
  }
  const filed = new Map(); // registrable domain → Set of category slugs
  for (const [category] of INDUSTRY) {
    try {
      for await (const cards of pages(`/${category}`)) {
        for (const { url } of cards) {
          const domain = candidateDomain(url);
          if (!domain) continue;
          if (!filed.has(domain)) filed.set(domain, new Set());
          filed.get(domain).add(category);
        }
      }
    } catch (err) {
      console.warn(`[${name}] skipping category ${category}: ${err.message}`);
    }
  }
  const seen = new Set();
  let yielded = 0;
  let cardsRead = 0;
  for await (const cards of pages("")) {
    for (const { slug, url: href } of cards) {
      cardsRead++;
      const url = siteUrl(href);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      if (yielded >= limit) return;
      yielded++;
      const categories = filed.get(candidateDomain(url));
      yield {
        url,
        industryHint: categories ? INDUSTRY.find(([c]) => categories.has(c))?.[1] ?? null : null,
        sourceRef: `${BASE}/detail/${slug}`,
      };
    }
  }
  if (!cardsRead) console.warn(`[${name}] no cards in the gallery; its markup may have changed`);
}
