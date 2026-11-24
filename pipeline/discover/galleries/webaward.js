// The WebAwards (webaward.org), the Web Marketing Association's website
// competition, run every year since 1997 and judged on design, ease of use,
// copy, interactivity, technology, innovation and content. Each year names one
// Best of Show and a Best of Industry winner in each of about 65 industry
// categories (Hyundai Motor Group, Aston Martin, Hilton, Visit California,
// Prague Airport, banks, universities, museums). The winners search answers a
// POST of year and award level with every winner's card as HTML: its title,
// its "<year> Best <category> Website" line (mapped to industry) and a link to
// the winner's page, whose headline links straight to the site, so one page is
// fetched per new site. The Outstanding Website and Standard of Excellence
// levels below Best of Industry are skipped, and so is the Small Business
// category. Years come from the search form, newest first, the latest four
// read. robots.txt allows everything.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml, postHtml } from "../http.js";

const BASE = "https://www.webaward.org";
const SEARCH = `${BASE}/winners_result.asp`;
const MAX_YEARS = 4;
const LEVELS = ["Best of Show", "Best"];
const SKIP = /^small business$/i;

export const name = "webaward";

// "Best <category> Website" category (lowercased) → lib/taxonomy.js INDUSTRIES.
// Broad categories (Advertising, Government, Marketing, Professional Services,
// Technology...) carry no hint.
const INDUSTRY = {
  advocacy: "Nonprofit",
  "non-profit": "Nonprofit",
  associations: "Nonprofit",
  environmental: "Nonprofit",
  architecture: "Architecture & Interior",
  construction: "Architecture & Interior",
  "home building": "Real estate",
  "real estate": "Real estate",
  arts: "Entertainment",
  entertainment: "Entertainment",
  events: "Entertainment",
  recreation: "Entertainment",
  sports: "Entertainment",
  radio: "Media & Publishing",
  publishing: "Media & Publishing",
  "e-zine": "Media & Publishing",
  blog: "Media & Publishing",
  photography: "Agency & Portfolio",
  design: "Agency & Portfolio",
  "interactive services": "Agency & Portfolio",
  "public relations": "Agency & Portfolio",
  saas: "SaaS",
  "computer: software": "SaaS",
  bank: "Finance",
  "credit union": "Finance",
  "financial services": "Finance",
  insurance: "Finance",
  investment: "Finance",
  "mutual fund": "Finance",
  blockchain: "Crypto",
  "crypto currency": "Crypto",
  education: "Education",
  school: "Education",
  university: "Education",
  "health care": "Health",
  "healthcare provider": "Health",
  medical: "Health",
  "medical equipment": "Health",
  pharmaceuticals: "Health",
  biotechnology: "Health",
  "fashion or beauty": "Fashion",
  "cooking and recipe": "Food & Drink",
  "food industry": "Food & Drink",
  restaurant: "Food & Drink",
  beverage: "Food & Drink",
  "hotel and lodging": "Travel",
  travel: "Travel",
  airline: "Travel",
  regional: "Travel",
  retail: "E-commerce",
  shopping: "E-commerce",
  catalog: "E-commerce",
  automobile: "Automotive",
};

const text = (s) => s.replace(/\s+/g, " ").trim();

// Award years offered by the search form, newest first.
async function years() {
  const $ = cheerio.load(await fetchHtml(`${BASE}/winners.asp`));
  const found = $("select[name=yr] option").map((_, o) => Number($(o).attr("value"))).get().filter((y) => y > 1996);
  return [...new Set(found)].sort((a, b) => b - a).slice(0, MAX_YEARS);
}

// The site a winner's page names: its headline links straight to it.
async function siteOf(page) {
  const $ = cheerio.load(await fetchHtml(page));
  let url = String($("h1 a[href]").first().attr("href") ?? "").trim();
  if (/^www\./i.test(url)) url = `https://${url}`;
  if (!/^https?:\/\/[^/]+\.[^/]+/i.test(url) || /^https?:\/\/([^/]+\.)?webaward\.org\b/i.test(url)) return null;
  return url;
}

export async function* listing({ limit }) {
  let all;
  try {
    all = await years();
  } catch (err) {
    console.warn(`[${name}] skipping: ${err.message}`);
    return;
  }
  if (!all.length) console.warn(`[${name}] no award years in the winners search form; its format may have changed`);
  const seen = new Set();
  let yielded = 0;
  for (const year of all) {
    for (const level of LEVELS) {
      let $;
      try {
        $ = cheerio.load(await postHtml(SEARCH, { yr: String(year), winner: "", award_level: level, site: "", category: "all", url: "" }));
      } catch (err) {
        console.warn(`[${name}] skipping ${year} ${level}: ${err.message}`);
        continue;
      }
      const cards = $(".post").get().flatMap((el) => {
        const href = $(el).find("h3 a[href]").attr("href") ?? $(el).find("a[href*='/winner/']").attr("href");
        if (!href || !/\/winner\/\d+\//.test(href)) return [];
        const category = text($(el).find(".text p").first().text()).match(/^\d{4}\s+Best (?:of Show )?(.*?)(?: Website)?$/i)?.[1]?.toLowerCase() ?? "";
        if (SKIP.test(category)) return [];
        return [{ page: new URL(href, BASE).href, title: text($(el).find("h3").text()), category }];
      });
      if (!cards.length && year === all[0] && level === "Best") console.warn(`[${name}] no winners for ${year}; the search results may have changed`);
      const known = cards.length ? await knownSourceRefs(cards.map((c) => c.page)) : new Set();
      for (const { page, title, category } of cards) {
        if (yielded >= limit) return;
        if (seen.has(page) || known.has(page)) continue;
        seen.add(page);
        let url;
        try {
          url = await siteOf(page);
        } catch (err) {
          console.warn(`[${name}] skipping ${page}: ${err.message}`);
          continue;
        }
        if (!url) continue;
        yielded++;
        yield {
          url,
          name: title || null,
          industryHint: INDUSTRY[category] ?? null,
          sourceRef: page,
        };
      }
    }
  }
}
