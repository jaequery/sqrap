// Applied Arts Awards (appliedartsmag.com), the annual awards of Applied Arts,
// Canada's magazine of visual communication, judged by a jury of Canadian and
// international practitioners since 2001. Its Design group carries website
// categories (Website Design, before 2021 and again from 2026 split into
// business-to-business, consumer, e-commerce, charity, educational, arts and
// tourism, and self-promotion classes) that name a handful of winners a year:
// brands, cultural institutions, charities and studios, many of them from
// Montreal and Toronto (Lithion Technologies, Lacroix Décor, Arketype, Thingy &
// Thingy). The winners archive filters by year, group and category; a year's
// categories come from the fragment its filter loads, and each category's page
// lists its winners (none has more than the 24 a page shows; the "load more"
// script is disallowed by robots.txt). Each winner page names the site after
// "Winning Website:" apart from the entrant agency's own link, so one page is
// fetched per new site (known source refs are skipped). Young Blood (student)
// categories are skipped. The latest ten years are read newest first.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://www.appliedartsmag.com";
const WINNERS = `${BASE}/winners`;
const CATEGORIES = `${BASE}/get_archive_categories.php`;
// Design, then Interactive (which held the web categories in some years).
const GROUPS = [2, 11];
const MAX_YEARS = 10;
const PAGE_SIZE = 24;
const WEBSITE = /web ?site/i;
const NOT_WEBSITES = /young blood|student/i;

export const name = "appliedarts";

const NOT_A_SITE = /^https?:\/\/([^/]+\.)?(appliedartsmag\.com|instagram\.com|linkedin\.com|facebook\.com|twitter\.com|x\.com|behance\.net|vimeo\.com|youtube\.com|youtu\.be|apps\.apple\.com|play\.google\.com)\b/i;

// Category or class wording → lib/taxonomy.js INDUSTRIES; others carry no hint.
const INDUSTRY = [
  [/e-?commerce/i, "E-commerce"],
  [/self-promotion|personal/i, "Agency & Portfolio"],
  [/charity|public service/i, "Nonprofit"],
  [/education/i, "Education"],
];

const text = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

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

// Award years from the archive's year filter, newest first (the AACE editions
// of 2012 to 2014 were a separate competition and are left out).
async function years() {
  const $ = cheerio.load(await fetchHtml(WINNERS));
  const found = new Set();
  $("select#year option").each((_, o) => {
    const v = text($(o).attr("value"));
    if (/^\d{4}$/.test(v)) found.add(Number(v));
  });
  return [...found].sort((a, b) => b - a).slice(0, MAX_YEARS);
}

// A year's website categories in a group, exactly as the filter submits them.
async function websiteCategories(year, groupId) {
  const qs = new URLSearchParams({ year: String(year), groupId: String(groupId), category: "" });
  const $ = cheerio.load(await fetchHtml(`${CATEGORIES}?${qs}`));
  return $("option")
    .get()
    .map((o) => $(o).attr("value") ?? "")
    .filter((v) => text(v) && WEBSITE.test(v) && !NOT_WEBSITES.test(v));
}

// The winner pages a category lists, in its order.
async function winnerPages(year, groupId, category) {
  const qs = new URLSearchParams({ year: String(year), groupId: String(groupId), category });
  const $ = cheerio.load(await fetchHtml(`${WINNERS}?${qs}`));
  const pages = [];
  $("a[href]").each((_, a) => {
    let u;
    try {
      u = new URL($(a).attr("href"), BASE);
    } catch {
      return;
    }
    if (u.origin !== BASE || !/^\/winners\/[^/]+-w\d+$/.test(u.pathname)) return;
    // Winner ids repeat across years, so the year stays part of the page.
    if (u.searchParams.get("year") !== String(year)) return;
    const page = `${BASE}${u.pathname}?year=${year}`;
    if (!pages.includes(page)) pages.push(page);
  });
  if (pages.length >= PAGE_SIZE) {
    console.warn(`[${name}] ${year} "${text(category)}" fills a page; later winners load by a disallowed script`);
  }
  return pages;
}

// The site after "Winning Website:", the client credit and the class line.
async function winner(page) {
  const $ = cheerio.load(await fetchHtml(page));
  let url = null;
  $("strong, b").each((_, el) => {
    if (url || !/^winning website:?$/i.test(text($(el).text()))) return;
    const a = $(el).nextAll("a[href]").first();
    url = asSite(a.attr("href"));
  });
  let client = null;
  $("b, strong").each((_, el) => {
    if (client || !/^clients?:?$/i.test(text($(el).text()))) return;
    const next = el.nextSibling;
    const value = next && next.type === "text" ? text(next.data.split(";")[0]) : "";
    if (value) client = value;
  });
  const title = text($("h1").first().text()).replace(/\s+-\s+web ?site\b.*$/i, "");
  return { url, name: client || title || null, cls: text($("h2.subheader2").first().text()) };
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
    const pages = [];
    for (const groupId of GROUPS) {
      try {
        for (const category of await websiteCategories(year, groupId)) {
          for (const page of await winnerPages(year, groupId, category)) {
            if (!pages.some((p) => p.page === page)) pages.push({ page, category });
          }
        }
      } catch (err) {
        console.warn(`[${name}] skipping ${year} group ${groupId}: ${err.message}`);
      }
    }
    if (!pages.length) {
      if (year === all[0]) console.warn(`[${name}] no website winners for ${year}; the page may have changed`);
      continue;
    }
    const known = await knownSourceRefs(pages.map((p) => p.page));
    for (const { page, category } of pages) {
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
      const hint = `${site.cls} ${category}`;
      yielded++;
      yield {
        url: site.url,
        name: site.name,
        industryHint: INDUSTRY.find(([re]) => re.test(hint))?.[1] ?? null,
        sourceRef: page,
      };
    }
  }
}
