// Internet Gems (ilovecreatives.com/internet-gem-websites), "the best websites on
// the web": the creative school ilovecreatives writes up one website a post, about
// 1,990 since 2021 and still added to every week in late 2026: designer and
// studio portfolios, shops, food and drink, fashion, jewelry, furniture, music and
// culture sites (Accent, Louise Jongen, Madre Mezcal, Stone Fruit, Henri Heymans),
// each with its designer and the fonts it uses. Some are sites its Squarespace
// course students built, picked into the same list.
// It is a Squarespace blog: the sitemap lists every post, read newest lastmod first
// (sitemap order, which is newest first, breaks ties), one request per post not yet
// stored as a site's sourceRef. The first link out in the post body is the site (a
// "www.<domain>" button, or a plain domain link on older posts); the links after it
// credit the designer and the font foundries. Squarespace previews, Webflow staging
// hosts and Readymag pages are skipped. The post's category classes hint an
// industry. robots.txt allows the posts (its AI-crawler group shares the `*`
// rules); its ?format=json views are disallowed and not used. It keeps the normal
// quality bar.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://ilovecreatives.com";
const POST = /^\/internet-gem-websites\/[^/]+\/?$/;
const OWN = /(^|\.)ilovecreatives\.(com|studio)$/i;
// Links that are not the site itself: Squarespace previews (rowies.squarespace.com,
// behind a password) and Webflow staging hosts, and Readymag pages, which sit under a
// path of readymag.website and would fold into Readymag's own home page.
const NOT_THE_SITE = /(^|\.)(squarespace\.com|webflow\.io|readymag\.website)$/i;
const BATCH = 50;

export const name = "ilovecreatives";

// Category class (`category-<slug>` on the post's <article>) to industry, most
// specific first: a post is often both e-commerce and food, fashion or jewelry.
const INDUSTRY_BY_CATEGORY = [
  [/^food-beverage$/, "Food & Drink"],
  [/^(fashion|jewelry)$/, "Fashion"],
  [/^(architecture|furniture)$/, "Architecture & Interior"],
  [/^music$/, "Music"],
  [/^(beauty-skincare|wellness)$/, "Health"],
  [/^educational$/, "Education"],
  [/^non-profit$/, "Nonprofit"],
  [/^(books-publication|blog|newsletter)$/, "Media & Publishing"],
  [/^(entertainment|events)$/, "Entertainment"],
  [/^software$/, "SaaS"],
  [/^e-commerce$/, "E-commerce"],
  [/^(agency|portfolio|studio|photography|web-design-development|marketing-branding|art-design|type-foundry)$/, "Agency & Portfolio"],
];

// The sitemap to post URLs, newest lastmod first (sitemap order breaks ties).
export function posts(xml) {
  const $ = cheerio.load(xml, { xml: true });
  return $("url")
    .map((i, el) => {
      const loc = $(el).find("loc").first().text().trim();
      const lastmod = Date.parse($(el).find("lastmod").text().trim()) || 0;
      return { loc, lastmod, i };
    })
    .get()
    .filter(({ loc }) => {
      try {
        const u = new URL(loc);
        return OWN.test(u.hostname) && POST.test(u.pathname) && !/^\/internet-gem-websites\/(tag|category)\b/.test(u.pathname);
      } catch {
        return false;
      }
    })
    .sort((a, b) => b.lastmod - a.lastmod || a.i - b.i)
    .map(({ loc }) => loc);
}

// A post to its site: the first absolute link out in the post body, or null when
// that link is a preview, staging or shared-path host.
export function site($) {
  const href = $("[data-layout-label='Post Body'] a[href^='http']")
    .map((_, a) => $(a).attr("href").trim())
    .get()
    .find((h) => {
      try {
        return !OWN.test(new URL(h).hostname);
      } catch {
        return false;
      }
    });
  return href && !NOT_THE_SITE.test(new URL(href).hostname) ? href : null;
}

export function industry($) {
  const categories = ($("article").first().attr("class") || "")
    .split(/\s+/)
    .filter((c) => c.startsWith("category-"))
    .map((c) => c.slice("category-".length));
  for (const [re, label] of INDUSTRY_BY_CATEGORY) {
    if (categories.some((c) => re.test(c))) return label;
  }
  return null;
}

export async function* listing({ limit }) {
  const refs = posts(await fetchHtml(`${BASE}/sitemap.xml`));
  if (!refs.length) {
    console.warn(`[${name}] no /internet-gem-websites/ posts in the sitemap; its format may have changed`);
    return;
  }
  const hosts = new Set();
  let yielded = 0;
  for (let i = 0; i < refs.length && yielded < limit; i += BATCH) {
    const batch = refs.slice(i, i + BATCH);
    const known = await knownSourceRefs(batch);
    for (const ref of batch) {
      if (yielded >= limit) return;
      if (known.has(ref)) continue;
      const $ = cheerio.load(await fetchHtml(ref));
      const url = site($);
      if (!url) continue;
      const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
      if (hosts.has(host)) continue;
      hosts.add(host);
      yielded++;
      yield { url, name: $("h1.BlogItem-title").first().text().trim() || null, industryHint: industry($), sourceRef: ref };
    }
  }
}
