// Studio's Editor's Pick (studio.design/ja/blog/<mon><year>), the monthly post
// in which the editors of Studio, the Japanese no-code site builder, pick the
// sites with the strongest design out of Studio Showcase and Studio Experts:
// five to nine a month since April 2024, about 170 in all (syuz'gen, Hokka
// Hokka-tei's 50th anniversary site, amana's Great River, SmartHR's REAL,
// creasta, Umeee). The blog's sitemap lists every post; the monthly ones are
// the slugs shaped like jun2026 (july2024 and april2024 spell the month out),
// read newest first. Each pick's link goes straight to the site and the post
// is its sourceRef, so no page per site is fetched. A run reads the posts in
// order and skips sites already stored by domain, so it costs at most about
// thirty requests. Studio Showcase itself (showcase.studio.design,
// about 2,450 reviewed submissions) is not read: its entries are mostly small
// local businesses and offices.
import * as cheerio from "cheerio";
import { knownDomains } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";
import { candidateDomain } from "../normalize.js";

const BASE = "https://studio.design";
const SITEMAP = `${BASE}/ja/blog/sitemap-dynamic/sitemap-dynamic-amEvYmxvZy86c2x1Zw.xml`;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTHLY = /^https:\/\/studio\.design\/ja\/blog\/([a-z]{3,9})(\d{4})$/;
// Links in a pick's paragraph that are never the site itself.
const NOT_A_SITE = /^https?:\/\/([^/]+\.)?(studio\.design|studio\.inc|studio\.community|partners\.studio\.site|note\.com|x\.com|twitter\.com|t\.co|instagram\.com|youtube\.com|vimeo\.com|facebook\.com|notion\.site|lu\.ma|luma\.com)\b/i;

export const name = "studioeditorspick";

// The monthly posts in the sitemap, newest first.
export function monthlyPosts(xml) {
  const posts = [];
  for (const [, loc] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const m = loc.trim().match(MONTHLY);
    if (!m) continue;
    const month = MONTHS.indexOf(m[1].slice(0, 3));
    if (month < 0) continue;
    posts.push({ url: loc.trim(), key: Number(m[2]) * 12 + month });
  }
  return posts.sort((a, b) => b.key - a.key).map((p) => p.url);
}

// The picks of one post: under each <h2> or <h3>, the first outbound link with
// text, named by that heading. The posts come in three forms (newest:
// "WebサイトURL：<site>" then the Studio Experts credit; late 2025: the Experts
// credit, then the site, then its Showcase page; up to mid-2025: "▲<name>" or
// the site's name linking to it, then the credit, sometimes then the credited
// studio's own site), and in all three the site is the first link that is not
// one of Studio's own pages (Showcase, Experts, Help) or a social or Notion
// page. Only the article body is read, not the footer or related posts;
// tweets embedded in a post are script text, not links.
export function parse($, post) {
  const picks = [];
  const seen = new Set();
  let heading = null;
  let taken = true;
  $("article .richText").first().find("h2, h3, a[href^='http']").each((_, el) => {
    if (el.tagName !== "a") {
      heading = $(el).text().replace(/\s+/g, " ").trim();
      taken = false;
      return;
    }
    if (taken) return;
    const href = $(el).attr("href").trim();
    const label = $(el).text().trim();
    if (!label || NOT_A_SITE.test(href)) return;
    taken = true;
    const domain = candidateDomain(href);
    if (!domain || seen.has(domain)) return;
    seen.add(domain);
    picks.push({ url: href, name: heading.split(/[｜|]/)[0].trim() || null, sourceRef: post });
  });
  return picks;
}

export async function* listing({ limit }) {
  let posts;
  try {
    posts = monthlyPosts(await fetchHtml(SITEMAP));
  } catch (err) {
    console.warn(`[${name}] skipping: ${err.message}`);
    return;
  }
  if (!posts.length) {
    console.warn(`[${name}] no monthly posts in ${SITEMAP}; the blog's sitemap may have changed`);
    return;
  }
  let yielded = 0;
  for (const post of posts) {
    if (yielded >= limit) return;
    let picks;
    try {
      picks = parse(cheerio.load(await fetchHtml(post)), post);
    } catch (err) {
      console.warn(`[${name}] skipping ${post}: ${err.message}`);
      continue;
    }
    if (!picks.length) {
      console.warn(`[${name}] no picks in ${post}; the post markup may have changed`);
      continue;
    }
    const known = await knownDomains(picks.map((p) => candidateDomain(p.url)));
    for (const pick of picks) {
      if (yielded >= limit) return;
      if (known.has(candidateDomain(pick.url))) continue;
      yielded++;
      yield pick;
    }
  }
}
