// UI Discovery (uidiscovery.com), a library of about 2,600 real website designs
// (Linear, Mercury, Vercel, Ramp...) cut into sections and sorted into 18
// categories. Its websites sitemap lists every /sites/<slug> page in the site's
// own rank order, best first; the listings link only to those pages, so one is
// fetched per new site for its "Visit <domain>" link. Pages already stored as a
// site's sourceRef are not fetched again. The page's flight data names the
// site's category, which is mapped to an industry (Lifestyle carries none).
// robots.txt allows the site pages to every crawler.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://uidiscovery.com";
const BATCH = 50;
const SITE_PAGE = /^https:\/\/uidiscovery\.com\/sites\/[^/?#]+$/;

export const name = "uidiscovery";

const INDUSTRY_BY_CATEGORY = {
  "AI": "AI",
  "Crypto & Web3": "Crypto",
  "Developer Tools": "Developer tools",
  "Productivity": "Productivity",
  "Finance": "Finance",
  "Shopping": "E-commerce",
  "Fashion & Beauty": "Fashion",
  "Health & Fitness": "Health",
  "Food & Drink": "Food & Drink",
  "Travel": "Travel",
  "Real Estate": "Real estate",
  "Entertainment": "Entertainment",
  "Education": "Education",
  "Marketing": "SaaS",
  "Technology": "SaaS",
  "Design & Agency": "Agency & Portfolio",
  "Portfolio": "Agency & Portfolio",
};

// The category in the page's flight data record for `slug`, or null.
function categoryOf(html, slug) {
  const esc = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`\\\\"site\\\\":\\{\\\\"slug\\\\":\\\\"${esc}\\\\"[^{}]*?\\\\"category\\\\":\\\\"((?:[^"\\\\]|\\\\u[0-9a-fA-F]{4})+)\\\\"`).exec(html);
  // "&" arrives as \u0026 inside the flight data's escaped strings.
  return m ? m[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))) : null;
}

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap/websites.xml`), { xml: true });
  const refs = [...new Set($map("url > loc").map((_, el) => $map(el).text().trim()).get().filter((u) => SITE_PAGE.test(u)))];
  if (!refs.length) console.warn(`[${name}] no /sites/ pages in the sitemap; its format may have changed`);
  let yielded = 0;
  for (let i = 0; i < refs.length && yielded < limit; i += BATCH) {
    const batch = refs.slice(i, i + BATCH);
    const known = await knownSourceRefs(batch);
    for (const ref of batch) {
      if (yielded >= limit) return;
      if (known.has(ref)) continue;
      let html;
      try {
        html = await fetchHtml(ref);
      } catch (err) {
        console.warn(`[${name}] skipping ${ref}: ${err.message}`);
        continue;
      }
      const $ = cheerio.load(html);
      const url = $("a[href^='http']").filter((_, a) => /^visit\b/i.test($(a).text().trim())).first().attr("href")?.trim();
      if (!url || /^https?:\/\/([^/]+\.)?uidiscovery\.com\b/i.test(url)) continue;
      const h1 = $("h1").first().clone();
      h1.find("span").remove();
      const slug = decodeURIComponent(ref.split("/").pop());
      yielded++;
      yield {
        url,
        name: h1.text().replace(/\s+/g, " ").trim() || null,
        industryHint: INDUSTRY_BY_CATEGORY[categoryOf(html, slug)] ?? null,
        sourceRef: ref,
      };
    }
  }
}
