// CTA Gallery (cta.gallery), a Framer-built gallery of call-to-action sections cut
// from about 520 real sites: SaaS and AI products (Tines, Attio, Craft, Synthesia,
// Wrike), shops and brands (Chobani, Kronborg), studios and portfolios (Quatre Cent
// Quatre, Two Hands, trevornoah.com). It was passed over once for being mostly
// templates; the templates are now a handful of entries that no industry page lists.
// Its sitemap lists every entry as /cta/<slug>, newest first (the home page's order),
// and each of its 24 industry pages renders its whole list server-side, every card a
// link to /cta/<slug> followed by a link straight to the site. So the sitemap and the
// industry pages, 25 requests, read the whole gallery with an industry for each site;
// an entry no industry page lists (a template) is skipped. robots.txt allows every page.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

const BASE = "https://www.cta.gallery";

export const name = "ctagallery";

// Industry page slug → lib/taxonomy.js INDUSTRIES, in the order an entry filed under
// several is matched, most specific first; tech and saas come last because about half
// the gallery is filed there next to something narrower. design, landing, logistic,
// marketing and services say nothing about the industry.
const INDUSTRY = [
  ["agency", "Agency & Portfolio"],
  ["portfolio", "Agency & Portfolio"],
  ["architecture", "Architecture & Interior"],
  ["cafe", "Food & Drink"],
  ["hotel", "Travel"],
  ["travel", "Travel"],
  ["real-estate", "Real estate"],
  ["nonprofit", "Nonprofit"],
  ["education", "Education"],
  ["medical", "Health"],
  ["health-fitness", "Health"],
  ["insurance", "Finance"],
  ["finance", "Finance"],
  ["ai", "AI"],
  ["ecommerce", "E-commerce"],
  ["event-conference", "Entertainment"],
  ["mobile-app", "Productivity"],
  ["saas", "SaaS"],
  ["tech", "SaaS"],
];

// Entry slugs and industry page slugs from the sitemap, in its order.
export function parseSitemap(xml) {
  const $ = cheerio.load(xml, { xml: true });
  const entries = [];
  const industries = [];
  $("loc").each((_, el) => {
    const m = $(el).text().trim().match(/^https:\/\/www\.cta\.gallery\/(cta|industry)\/([^/?#]+)$/);
    if (!m) return;
    (m[1] === "cta" ? entries : industries).push(m[2]);
  });
  return { entries: [...new Set(entries)], industries: [...new Set(industries)] };
}

function siteUrl(href) {
  try {
    const url = new URL(String(href ?? "").trim());
    if (!/^https?:$/.test(url.protocol) || /(^|\.)(cta\.gallery|framer\.com|webestica\.com)$/i.test(url.hostname)) return null;
    url.searchParams.delete("ref");
    return url.href;
  } catch {
    return null;
  }
}

// An industry page's cards: slug → { url, name }.
export function parseIndustry($) {
  const cards = new Map();
  $("a[href^='../cta/']").each((_, a) => {
    const slug = $(a).attr("href").slice("../cta/".length);
    if (cards.has(slug)) return;
    const url = siteUrl($(a).nextAll("a[target='_blank']").first().attr("href"));
    if (url) cards.set(slug, { url, name: $(a).find("p").first().text().trim() || null });
  });
  return cards;
}

export async function* listing({ limit }) {
  const { entries, industries } = parseSitemap(await fetchHtml(`${BASE}/sitemap.xml`));
  if (!entries.length) {
    console.warn(`[${name}] no /cta/ entries in the sitemap; its format may have changed`);
    return;
  }
  const cards = new Map(); // slug → { url, name, filed: Set of industry slugs }
  for (const industry of industries) {
    let $;
    try {
      $ = cheerio.load(await fetchHtml(`${BASE}/industry/${industry}`));
    } catch (err) {
      console.warn(`[${name}] skipping industry ${industry}: ${err.message}`);
      continue;
    }
    for (const [slug, card] of parseIndustry($)) {
      if (!cards.has(slug)) cards.set(slug, { ...card, filed: new Set() });
      cards.get(slug).filed.add(industry);
    }
  }
  if (!cards.size) {
    console.warn(`[${name}] no site cards on its industry pages; the pages may have changed`);
    return;
  }
  let yielded = 0;
  for (const slug of entries) {
    if (yielded >= limit) return;
    const card = cards.get(slug);
    if (!card) continue; // a template, or an entry not yet filed under an industry
    yielded++;
    yield {
      url: card.url,
      name: card.name,
      industryHint: INDUSTRY.find(([s]) => card.filed.has(s))?.[1] ?? null,
      sourceRef: `${BASE}/cta/${slug}`,
    };
  }
}
