// Visuelt (grafill.no/visuelt), the annual award of Grafill, Norway's
// organisation for visual communication, judged by a jury of practitioners
// since 2001. Its Digital design category (Interaktiv design before 2015) names
// a few dozen winners a year in classes for brand websites, e-commerce, studios'
// own sites, campaigns and digital services: museums, festivals, architects,
// hotels, shops and studios (Det kongelige hoff, Dark Arkitekter, Røroshotellene,
// Rauma Garn, Snøhetta, Cinemateket, Bielke&Yang). Winners are static pages at
// /visuelt/vinnere/<year>/<category>/<class>/<slug>; the category page lists
// them all, and each winner's credits end with a link to the site, so one page
// is fetched per new site (known source refs are skipped). Classes that are not
// websites (student work, installations and games, design systems, editorial
// articles inside news sites, mobile apps) are skipped, as are winners whose
// credits link nothing (apps and most entries of some years). Years come from
// the winners page, newest first, the latest ten read. robots.txt disallows
// only /craft/.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://www.grafill.no";
const WINNERS = `${BASE}/visuelt/vinnere`;
const CATEGORY = /^(digital|interaktiv)-design$/;
const MAX_YEARS = 10;
const NOT_WEBSITES = /studentarbeid|installasjon|spill|designsystem|redaksjonell|mobil|arsrapport/;

export const name = "visuelt";

const NOT_A_SITE = /^https?:\/\/([^/]+\.)?(grafill\.no|instagram\.com|linkedin\.com|facebook\.com|twitter\.com|x\.com|behance\.net|vimeo\.com|youtube\.com|youtu\.be|apps\.apple\.com|itunes\.apple\.com|play\.google\.com|goo\.gl|ntb\.no)\b/i;

// Class slug → lib/taxonomy.js INDUSTRIES; other classes carry no hint.
const INDUSTRY = [
  [/netthandel/, "E-commerce"],
  [/egenprofil/, "Agency & Portfolio"],
];

const text = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const pathOf = (href) => {
  try {
    const u = new URL(href, BASE);
    return u.origin === BASE ? u.pathname.replace(/\/+$/, "") : null;
  } catch {
    return null;
  }
};

function asSite(href) {
  let url = text(href);
  if (/^www\./i.test(url)) url = `https://${url}`;
  if (!/^https?:\/\/[^/]+\.[^/]+/i.test(url) || NOT_A_SITE.test(url)) return null;
  try {
    return new URL(url).href;
  } catch {
    return null;
  }
}

// The years on the winners page, newest first.
async function years() {
  const $ = cheerio.load(await fetchHtml(WINNERS));
  const found = new Set();
  $("a[href]").each((_, a) => {
    const m = pathOf($(a).attr("href"))?.match(/^\/visuelt\/vinnere\/(\d{4})$/);
    if (m) found.add(Number(m[1]));
  });
  return [...found].sort((a, b) => b - a).slice(0, MAX_YEARS);
}

// A year's digital category page (its slug changed in 2015), or null.
async function categoryOf(year) {
  const $ = cheerio.load(await fetchHtml(`${WINNERS}/${year}`));
  for (const a of $("a[href]").get()) {
    const path = pathOf($(a).attr("href"));
    const slug = path?.match(new RegExp(`^/visuelt/vinnere/${year}/([^/]+)$`))?.[1];
    if (slug && CATEGORY.test(slug)) return `${BASE}${path}`;
  }
  return null;
}

// The winner pages a category page lists, in its order, website classes only.
async function winnerPages(category) {
  const $ = cheerio.load(await fetchHtml(category));
  const prefix = new URL(category).pathname;
  const pages = [];
  $("a[href]").each((_, a) => {
    const path = pathOf($(a).attr("href"));
    if (!path?.startsWith(`${prefix}/`)) return;
    const [cls, slug, ...rest] = path.slice(prefix.length + 1).split("/");
    if (!cls || !slug || rest.length || NOT_WEBSITES.test(cls)) return;
    const page = `${BASE}${path}`;
    if (!pages.some((p) => p.page === page)) pages.push({ page, cls });
  });
  return pages;
}

// The site a winner's credits link, and the client they name ("Oppdragsgiver";
// "Egeninitiert" marks a studio's own entry).
async function winner(page) {
  const $ = cheerio.load(await fetchHtml(page));
  const details = $(".winner-article__details-text").first();
  const url = details.find("a[href]").get().map((a) => asSite($(a).attr("href"))).find(Boolean) ?? null;
  let client = null;
  details.find("p").each((_, p) => {
    const label = text($(p).find("strong").first().text()).toLowerCase();
    if (label !== "oppdragsgiver") return;
    const value = text($(p).clone().find("strong").remove().end().text());
    if (value && !/^egeninitiert$/i.test(value)) client = value;
  });
  return { url, client };
}

export async function* listing({ limit }) {
  let all;
  try {
    all = await years();
  } catch (err) {
    console.warn(`[${name}] skipping: ${err.message}`);
    return;
  }
  if (!all.length) {
    console.warn(`[${name}] no years on ${WINNERS}; the page may have changed`);
    return;
  }
  let yielded = 0;
  for (const year of all) {
    let pages;
    try {
      const category = await categoryOf(year);
      if (!category) {
        console.warn(`[${name}] no digital design category for ${year}; the page may have changed`);
        continue;
      }
      pages = await winnerPages(category);
    } catch (err) {
      console.warn(`[${name}] skipping ${year}: ${err.message}`);
      continue;
    }
    if (!pages.length) {
      if (year === all[0]) console.warn(`[${name}] no winners for ${year}; the page may have changed`);
      continue;
    }
    const known = await knownSourceRefs(pages.map((p) => p.page));
    for (const { page, cls } of pages) {
      if (yielded >= limit) return;
      if (known.has(page)) continue;
      let site;
      try {
        site = await winner(page);
      } catch (err) {
        console.warn(`[${name}] skipping ${page}: ${err.message}`);
        continue;
      }
      if (!site.url) continue;
      yielded++;
      yield {
        url: site.url,
        name: site.client,
        industryHint: INDUSTRY.find(([re]) => re.test(cls))?.[1] ?? null,
        sourceRef: page,
      };
    }
  }
}
