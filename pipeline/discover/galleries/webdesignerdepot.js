// Webdesigner Depot's "Best New Websites" (webdesignerdepot.com), the monthly
// roundup in which its editors picked about twenty of the month's best new
// sites, each with a screenshot and a few lines on its design: Muskegon Art
// Museum, Columbia's Elders Project, Emergence Magazine, WeTransfer's
// Lifeworld, Omega's Clearspace, Calexo. The series ran from April 2020 to
// November 2024, with a yearly "best websites of" roundup, and grew out of
// "Best New Portfolios" (December 2015 to March 2020, about twenty designers'
// and studios' portfolios a month): about 100 posts, roughly 1,900 sites. The
// posts are found through the blog's WordPress API, two title searches ("best
// sites", "best portfolio") of up to 100 posts a request (its sitemaps spread
// them over 29 files and miss a few); the roundups are the slugs shaped like
// 20-best-new-websites-november-2024, best-websites-nov-2023,
// 50-best-websites-of-2021 or the-best-new-portfolio-sites-may-2017, read
// newest first (a year's roundup before its months). Each pick is a heading
// whose own link, or the first outbound link after it (in the copy or on its
// screenshot), goes straight to the site; the post is its sourceRef, so no page
// per site is fetched. A run reads the posts in order and skips sites already
// stored by domain. robots.txt bars only admin, search and analytics paths.
import * as cheerio from "cheerio";
import { knownDomains } from "../../../lib/db.js";
import { fetchHtml, fetchJson } from "../http.js";
import { candidateDomain } from "../normalize.js";

const API = "https://webdesignerdepot.com/wp-json/wp/v2/posts";
const SEARCHES = ["best sites", "best portfolio"];
const PER_PAGE = 100;
const MAX_PAGES = 5;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const ROUNDUP =
  /^https:\/\/webdesignerdepot\.com\/(?:the-|introducing-)?(?:\d+-)?best-(?:new-)?(websites|sites|portfolios|portfolio-sites)(?:-of)?-(?:([a-z]+)-)?(\d{4})(?:-\d)?\/$/;
// Links in a post body that are never the site itself.
const NOT_A_SITE =
  /^https?:\/\/([^/]+\.)?(webdesignerdepot\.com|cloudfront\.net|twitter\.com|x\.com|t\.co|facebook\.com|instagram\.com|linkedin\.com|pinterest\.com|youtube\.com|vimeo\.com|dribbble\.com|behance\.net|awwwards\.com)\b/i;

export const name = "webdesignerdepot";

// The roundup posts among the given post links, newest first: a year's roundup
// sorts after its December, so it is read before that year's months.
export function roundupPosts(links) {
  const posts = new Map();
  for (const url of links) {
    const m = url.match(ROUNDUP);
    if (!m) continue;
    const month = m[2] ? MONTHS.indexOf(m[2].slice(0, 3)) : 12;
    if (month < 0) continue;
    posts.set(url, { url, key: Number(m[3]) * 13 + month, portfolios: m[1].startsWith("portfolio") });
  }
  return [...posts.values()].sort((a, b) => b.key - a.key);
}

// The picks of one post: under each heading, the heading's own outbound link or
// else the first one after it, named by the heading. The posts come in two
// forms (from 2024: the heading links to the site; earlier: a plain heading,
// then the site linked in the copy and on its screenshot), and in both the site
// is the first link that is not the blog's own, a social profile or an image.
// Only the article body is read, not the sidebar, related posts or footer.
export function parse($, post) {
  const picks = [];
  const seen = new Set();
  let heading = null;
  let taken = true;
  $(".article-single").first().find("h1, h2, h3, a[href^='http']").each((_, el) => {
    if (el.tagName !== "a") {
      heading = $(el).text().replace(/\s+/g, " ").trim();
      taken = !heading;
      return;
    }
    if (taken) return;
    const href = $(el).attr("href").trim();
    if (NOT_A_SITE.test(href)) return;
    taken = true;
    const domain = candidateDomain(href);
    if (!domain || seen.has(domain)) return;
    seen.add(domain);
    picks.push({
      url: href,
      name: heading,
      industryHint: post.portfolios ? "Agency & Portfolio" : null,
      sourceRef: post.url,
    });
  });
  return picks;
}

export async function* listing({ limit }) {
  let posts;
  try {
    const links = [];
    for (const search of SEARCHES) {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const params = new URLSearchParams({ search, search_columns: "post_title", per_page: PER_PAGE, page, _fields: "link" });
        const batch = await fetchJson(`${API}?${params}`);
        links.push(...batch.map((p) => p.link));
        if (batch.length < PER_PAGE) break;
      }
    }
    posts = roundupPosts(links);
  } catch (err) {
    console.warn(`[${name}] skipping: ${err.message}`);
    return;
  }
  if (!posts.length) {
    console.warn(`[${name}] no roundup posts found through ${API}; the API or the slugs may have changed`);
    return;
  }
  let yielded = 0;
  for (const post of posts) {
    if (yielded >= limit) return;
    let picks;
    try {
      picks = parse(cheerio.load(await fetchHtml(post.url)), post);
    } catch (err) {
      console.warn(`[${name}] skipping ${post.url}: ${err.message}`);
      continue;
    }
    if (!picks.length) {
      console.warn(`[${name}] no picks in ${post.url}; the post markup may have changed`);
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
