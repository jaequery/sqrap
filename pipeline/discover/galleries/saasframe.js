// SaaSFrame (saasframe.io), a library of real web and app screens from about
// 360 SaaS products (Didit, Hebbia, Infisical, Factory and the like). It was
// noted as not adaptable because its pages carried no outbound site links; its
// served /saas page now lists every product, most recently added first, with
// its category, and each /saas/<slug> page names the product's site in its
// Organization JSON-LD and on its "Visit website" button. The adapter reads the
// listing once, fetches one product page per new site, maps the category to an
// industry with SaaS as the fallback, and skips pages already stored as a
// site's sourceRef. robots.txt only disallows /api/, /app/, /auth/ and search
// queries.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://www.saasframe.io";
const BATCH = 50;

export const name = "saasframe";

// The product's own site: the Organization JSON-LD url, else the Visit button.
function siteOf($) {
  let url = null;
  $("script[type='application/ld+json']").each((_, el) => {
    if (url) return;
    try {
      const data = JSON.parse($(el).text());
      for (const node of [].concat(data, data?.["@graph"] ?? [])) {
        if (node?.["@type"] === "Organization" && /^https?:\/\//.test(node.url ?? "") && !/saasframe\.io/.test(node.url)) {
          url = node.url;
          return;
        }
      }
    } catch {
      // Malformed JSON-LD: fall back to the button.
    }
  });
  if (url) return url;
  const visit = $("a[href^='http']").filter((_, a) => /^\s*visit website\s*$/i.test($(a).text())).first();
  return visit.attr("href") || $("a.brand-site[href^='http']").first().attr("href") || null;
}

export async function* listing({ limit }) {
  const $list = cheerio.load(await fetchHtml(`${BASE}/saas`));
  const entries = [];
  const seen = new Set();
  $list("article.saas-tile").each((_, el) => {
    const a = $list(el).find("a.saas-tile-name[href^='/saas/']").first();
    const path = a.attr("href");
    if (!path || !/^\/saas\/[^/?#]+$/.test(path)) return;
    const ref = `${BASE}${path}`;
    if (seen.has(ref)) return;
    seen.add(ref);
    entries.push({ ref, name: a.text().trim() || null, category: $list(el).find(".saas-tile-meta").first().text().trim() });
  });
  if (!entries.length) console.warn(`[${name}] no products on /saas; its markup may have changed`);
  let yielded = 0;
  for (let i = 0; i < entries.length && yielded < limit; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    const known = await knownSourceRefs(batch.map((e) => e.ref));
    for (const entry of batch) {
      if (yielded >= limit) return;
      if (known.has(entry.ref)) continue;
      let url;
      try {
        url = siteOf(cheerio.load(await fetchHtml(entry.ref)));
      } catch (err) {
        console.warn(`[${name}] ${entry.ref}: ${err.message}`);
        continue;
      }
      if (!url) continue;
      yielded++;
      yield { url, name: entry.name, industryHint: industryFromTags(entry.category) || "SaaS", sourceRef: entry.ref };
    }
  }
}
