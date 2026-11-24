// MABTU (mabtu.com), "the index of well-made websites": about 1,700 rated,
// full-page captures of product, agency and brand sites (Huly, Intercom,
// Brilliant, Aino, DedCool...), with more added every day. Its sitemap lists
// every /sites/<slug> page with the time it was last captured; pages are read
// newest first. Each page's JSON-LD Review names the site, links straight to it
// and carries MABTU's 1-10 rating, and its breadcrumb names the industry.
// Sites rated below 7 and Framer or Webflow marketplace templates are skipped.
// Pages already stored as a site's sourceRef are not fetched again. robots.txt
// allows everything but query strings and account pages.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://mabtu.com";
const BATCH = 50;
const MIN_RATING = 7;
const SITE_PAGE = /^https:\/\/mabtu\.com\/sites\/[^/?#]+$/;
const TEMPLATE = /\b(framer\.com\/marketplace|webflow\.com\/templates)\b/;

export const name = "mabtu";

function graph($) {
  for (const el of $("script[type='application/ld+json']").toArray()) {
    try {
      const data = JSON.parse($(el).text());
      return [].concat(data?.["@graph"] ?? data);
    } catch { /* not JSON */ }
  }
  return [];
}

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const refs = $map("url").map((_, el) => ({
    ref: $map(el).children("loc").text().trim(),
    at: $map(el).children("lastmod").text().trim(),
  })).get().filter((u) => SITE_PAGE.test(u.ref)).sort((a, b) => b.at.localeCompare(a.at)).map((u) => u.ref);
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
      const nodes = graph($);
      const review = nodes.find((n) => n?.["@type"] === "Review");
      const site = review?.itemReviewed;
      const url = site?.url;
      if (!url || !/^https?:\/\//.test(url) || /^https?:\/\/([^/]+\.)?mabtu\.com\b/i.test(url)) continue;
      if (Number(review.reviewRating?.ratingValue) < MIN_RATING) continue;
      if ($("a[href]").toArray().some((a) => TEMPLATE.test($(a).attr("href")))) continue;
      const crumbs = nodes.find((n) => n?.["@type"] === "WebPage")?.breadcrumb?.itemListElement ?? [];
      const crumb = crumbs.find((c) => /\/industry\//.test(c?.item ?? ""));
      yielded++;
      yield {
        url,
        name: site.name || null,
        industryHint: industryFromTags(crumb?.name?.replace(/-/g, " ")),
        sourceRef: ref,
      };
    }
  }
}
