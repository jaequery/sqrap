// Communication Arts (commarts.com), the design and advertising magazine whose
// juried annual competitions have run since 1959. Its Interactive Annual names
// about a dozen Websites/Microsites winners a year, from brands and museums to
// studios' own sites and experiments (Cartier, the Getty, Google Research,
// Resn, Blast Foundry, Typeforce). The gallery page is a shell whose cards come
// from a JSON route named on its filter (/json/gallery?d=&c=&i=&y=&Page=); a
// filter of discipline, category and year answers the cards as HTML, 20 a page.
// Each winner's page names its industry in the category line and links the
// site ("Launch Site" under the caption, or in the credits on older pages), so
// one page is fetched per new site (known source refs are skipped). Microsites deep inside a brand's site still lead to its home
// page once normalized. Years come from the gallery's year filter, newest
// first, the latest ten read. commarts.com has no robots.txt (404).
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { allowedByRobots, fetchHtml, fetchJson } from "../http.js";

const BASE = "https://www.commarts.com";
const GALLERY = `${BASE}/gallery?d=interactive`;
const DISCIPLINE = "interactive";
const CATEGORY = "websites-microsites";
const MAX_YEARS = 10;
const MAX_PAGES = 5;

export const name = "commarts";

const NOT_A_SITE = /^https?:\/\/([^/]+\.)?(commarts\.com|instagram\.com|linkedin\.com|facebook\.com|twitter\.com|x\.com|behance\.net|vimeo\.com|youtube\.com|apps\.apple\.com|play\.google\.com)\b/i;

// The category line's industry ("Interactive / Websites/Microsites / <industry>")
// → lib/taxonomy.js INDUSTRIES. Broad ones (Art/Design, Business, Lifestyle,
// Technology) carry no hint.
const INDUSTRY = {
  "fashion/beauty": "Fashion",
  education: "Education",
  "politics/social issues": "Nonprofit",
  entertainment: "Entertainment",
  sports: "Entertainment",
  news: "Media & Publishing",
  "food/drink": "Food & Drink",
  "travel/transportation": "Travel",
  health: "Health",
};

const LAUNCH = /^(launch|visit|view)\b.*\b(site|website)\b/i;

const text = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

// Award years offered by the gallery's year filter, newest first.
async function years() {
  const $ = cheerio.load(await fetchHtml(GALLERY));
  const found = $("[data-val]").map((_, el) => Number($(el).attr("data-val"))).get().filter((y) => y > 1990 && y < 2100);
  return [...new Set(found)].sort((a, b) => b - a).slice(0, MAX_YEARS);
}

// The winners' pages in one page of a year's Websites/Microsites cards.
async function cards(year, page) {
  const url = `${BASE}/json/gallery?d=${DISCIPLINE}&c=${CATEGORY}&i=&y=${year}&Page=${page}`;
  if (!(await allowedByRobots(url))) throw new Error(`robots.txt disallows ${url}`);
  const data = await fetchJson(url);
  if (!data?.Html) return [];
  const $ = cheerio.load(data.Html);
  return $("a.project-link[href]").get().flatMap((a) => {
    const href = $(a).attr("href");
    if (!/^\/project\/\d+\//.test(href)) return [];
    return [{ page: new URL(href, BASE).href, title: text($(a).attr("data-title") || $(a).find(".title").text()) }];
  });
}

// The site a winner's page credits, and its industry.
async function winner(page) {
  const $ = cheerio.load(await fetchHtml(page));
  const industry = text($(".head-wrapper .category").first().text()).split(" / ").slice(2).join(" / ").toLowerCase();
  const site = (a) => {
    let href = text($(a).attr("href"));
    if (/^www\./i.test(href)) href = `https://${href}`;
    return /^https?:\/\/[^/]+\.[^/]+/i.test(href) && !NOT_A_SITE.test(href) ? href : null;
  };
  // Recent pages link the site as "Launch Site" under the caption; older ones
  // put it in the credits.
  const launch = $(".captions a[href]").get().filter((a) => LAUNCH.test(text($(a).text())));
  const url = [...launch, ...$(".credits a[href]").get()].map(site).find(Boolean) ?? null;
  return { url, title: text($("h1.title").first().text()), industry };
}

export async function* listing({ limit }) {
  let all;
  try {
    all = await years();
  } catch (err) {
    console.warn(`[${name}] skipping: ${err.message}`);
    return;
  }
  if (!all.length) console.warn(`[${name}] no years in the gallery's year filter; its format may have changed`);
  const seen = new Set();
  let yielded = 0;
  for (const year of all) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      let found;
      try {
        found = await cards(year, page);
      } catch (err) {
        console.warn(`[${name}] skipping ${year} page ${page}: ${err.message}`);
        break;
      }
      if (!found.length) {
        if (year === all[0] && page === 1) console.warn(`[${name}] no winners for ${year}; the gallery route may have changed`);
        break;
      }
      const fresh = found.filter((c) => !seen.has(c.page));
      if (!fresh.length) break;
      const known = await knownSourceRefs(fresh.map((c) => c.page));
      for (const card of fresh) {
        if (yielded >= limit) return;
        seen.add(card.page);
        if (known.has(card.page)) continue;
        let site;
        try {
          site = await winner(card.page);
        } catch (err) {
          console.warn(`[${name}] skipping ${card.page}: ${err.message}`);
          continue;
        }
        if (!site.url) continue;
        yielded++;
        yield {
          url: site.url,
          name: site.title || card.title || null,
          industryHint: INDUSTRY[site.industry] ?? null,
          sourceRef: card.page,
        };
      }
    }
  }
}
