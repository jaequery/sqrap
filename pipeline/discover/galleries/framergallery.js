// Framer Gallery (framer.com/community/gallery), the sites Framer picks for its
// community gallery: studio and personal portfolios, startups, SaaS, AI,
// e-commerce, fashion and hospitality sites (48 Gallery, 55N, Atomico...),
// updated through November 2026, with a Site of the Month award. `?page=` is
// ignored and the gallery loads later cards client-side, but the served HTML of
// the gallery home and of each of its 32 /categories/<slug>/ pages holds up to
// 64 /community/gallery/<slug>/ links, about 1,500 distinct sites in all. Those
// pages are read gallery home first, then category by category; cards carry no
// outbound link, so one detail page is fetched per new site, whose "Visit Site"
// button links out to it and whose category link names the industry. Detail
// pages already stored as a site's sourceRef are not fetched again. robots.txt
// allows everything but /api-proxy and some query filters.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://www.framer.com";
const GALLERY = `${BASE}/community/gallery/`;
const DETAIL = /^\/community\/gallery\/(?!categories\/)[\w-]+\/$/;

export const name = "framer-gallery";

// "nonprofits" and "apps" miss the keyword list by their plural.
const CATEGORY = { nonprofits: "nonprofit", apps: "app" };

function industryFromCategory(slug) {
  return slug ? industryFromTags(CATEGORY[slug] ?? slug.replace(/-/g, " ")) : null;
}

// The gallery home, then every category page it links to.
function listingPages($home) {
  const categories = $home("a[href^='/community/gallery/categories/']")
    .map((_, a) => $home(a).attr("href")).get()
    .filter((href) => /^\/community\/gallery\/categories\/[\w-]+\/$/.test(href));
  return [...new Set(categories)].map((href) => BASE + href);
}

function detailRefs($) {
  return [...new Set($("a[href^='/community/gallery/']").map((_, a) => $(a).attr("href")).get()
    .filter((href) => DETAIL.test(href)))].map((href) => BASE + href);
}

export async function* listing({ limit }) {
  const $home = cheerio.load(await fetchHtml(GALLERY));
  const pages = [GALLERY, ...listingPages($home)];
  const seen = new Set();
  let yielded = 0;
  for (const pageUrl of pages) {
    if (yielded >= limit) return;
    let $;
    try {
      $ = pageUrl === GALLERY ? $home : cheerio.load(await fetchHtml(pageUrl));
    } catch (err) {
      console.warn(`[${name}] skipping ${pageUrl}: ${err.message}`);
      continue;
    }
    const refs = detailRefs($).filter((ref) => !seen.has(ref));
    refs.forEach((ref) => seen.add(ref));
    const known = await knownSourceRefs(refs);
    for (const ref of refs) {
      if (yielded >= limit) return;
      if (known.has(ref)) continue;
      let html;
      try {
        html = await fetchHtml(ref);
      } catch (err) {
        console.warn(`[${name}] skipping ${ref}: ${err.message}`);
        continue;
      }
      const $d = cheerio.load(html);
      const url = $d("a[target='_blank'][href^='http']").filter((_, a) => /^visit site$/i.test($d(a).text().trim())).first().attr("href");
      if (!url) continue;
      const category = $d("a[href^='/community/gallery/categories/']").first().attr("href")?.split("/")[4];
      yielded++;
      yield {
        url,
        name: $d("title").text().replace(/\s+—\s+Framer Gallery\s*$/, "").trim() || null,
        industryHint: industryFromCategory(category),
        sourceRef: ref,
      };
    }
  }
  if (!seen.size) console.warn(`[${name}] no site cards on the gallery pages; the markup may have changed`);
}
