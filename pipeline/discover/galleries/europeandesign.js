// The European Design Awards (europeandesign.org), Europe's design awards
// since 2007, judged by the editors of Europe's design magazines. Its website
// categories, 701 Brand & Campaign Websites, 702 Information Websites, 703
// E-Commerce Platforms and 802 Self-Promotion - Digital (studios' own sites),
// hand out a handful of Gold, Silver and Bronze awards a year (Woodnest,
// Monotype, Kunsthal Rotterdam, Ganttic, Studio Airport, museums, festivals,
// architects). The winners page is a form whose results come from a POST to
// /srv/loadWinners that needs the page's session cookie and CSRF token; it
// answers JSON rows of a year and category. Each winner's page links the site
// under its headline, so one page is fetched per new site. Years and category
// ids come from the form's selects, newest year first, the latest ten read.
// Links to an agency's case study (…/work/…) instead of the site, and staging
// hosts, are skipped.
// robots.txt allows everything.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { countryCode } from "../country.js";
import { fetchHtml, fetchHtmlSession, postHtml } from "../http.js";

const BASE = "https://awards.europeandesign.org";
const MAX_YEARS = 10;

export const name = "europeandesign";

// Category number → industry hint (lib/taxonomy.js INDUSTRIES).
const CATEGORIES = { 701: null, 702: null, 703: "E-commerce", 802: "Agency & Portfolio" };
const SELF_PROMOTION = 802;
const CASE_STUDY = /\/(work|works|projects?|proyectos|projekte|projets|progetti|case-stud(y|ies)|portfolio|cases?)\/./i;
const STAGING = /(^|\.)(staging|stage)\./i;
const NOT_A_SITE = /^https?:\/\/([^/]+\.)?(europeandesign\.org|vimeo\.com|youtu\.be|issuu\.com)\b/i;

const text = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

// The form's years ({ id, year }, newest first) and website categories ({ id, number }).
function form(html) {
  const $ = cheerio.load(html);
  const years = $("#year option").get()
    .map((o) => ({ id: $(o).attr("value"), year: Number(text($(o).text())) }))
    .filter((y) => y.year > 2000)
    .sort((a, b) => b.year - a.year)
    .slice(0, MAX_YEARS);
  const categories = $("#category option").get()
    .map((o) => ({ id: $(o).attr("value"), number: Number(text($(o).text()).match(/^(\d{3})\s/)?.[1]) }))
    .filter((c) => c.number in CATEGORIES);
  const token = html.match(/_token['"]\s*,\s*['"]([^'"]+)['"]/)?.[1] ?? $("input[name=_token]").attr("value") ?? null;
  return { years, categories, token };
}

// The site a winner's page links under its headline.
async function siteOf(page, selfPromotion) {
  const $ = cheerio.load(await fetchHtml(page));
  let url = text($("h1").first().nextAll("p").find("a[href]").first().attr("href"));
  if (/^www\./i.test(url)) url = `https://${url}`;
  if (!/^https?:\/\/[^/]+\.[^/]+/i.test(url) || NOT_A_SITE.test(url)) return null;
  const { hostname, pathname } = new URL(url);
  if (STAGING.test(hostname)) return null;
  if (!selfPromotion && CASE_STUDY.test(pathname)) return null;
  return url;
}

export async function* listing({ limit }) {
  let session, years, categories, token;
  try {
    const res = await fetchHtmlSession(`${BASE}/winners`);
    session = res.cookie;
    ({ years, categories, token } = form(res.html));
  } catch (err) {
    console.warn(`[${name}] skipping: ${err.message}`);
    return;
  }
  if (!years.length || !categories.length || !token) {
    console.warn(`[${name}] no years, website categories or token in the winners form; its format may have changed`);
    return;
  }
  const seen = new Set();
  let yielded = 0;
  for (const { id: year, year: label } of years) {
    for (const { id: category, number } of categories) {
      let rows;
      try {
        const body = await postHtml(`${BASE}/srv/loadWinners`, { year, category, award: "0", country: "0", currentPage: "1", _token: token }, { cookie: session });
        rows = JSON.parse(body).rows ?? [];
      } catch (err) {
        console.warn(`[${name}] skipping ${label} ${number}: ${err.message}`);
        continue;
      }
      // A submission can come twice (once per credited agency); keep the first.
      const byId = new Map();
      for (const r of rows) if (r.submission_id && !byId.has(r.submission_id)) byId.set(r.submission_id, r);
      const entries = [...byId.values()].map((r) => ({
        page: `${BASE}/winner/${r.submission_id}`,
        title: text(r.title),
        country: r.agency_country,
      }));
      const known = entries.length ? await knownSourceRefs(entries.map((e) => e.page)) : new Set();
      for (const { page, title, country } of entries) {
        if (yielded >= limit) return;
        if (seen.has(page) || known.has(page)) continue;
        seen.add(page);
        let url;
        try {
          url = await siteOf(page, number === SELF_PROMOTION);
        } catch (err) {
          console.warn(`[${name}] skipping ${page}: ${err.message}`);
          continue;
        }
        if (!url) continue;
        yielded++;
        yield {
          url,
          name: title || null,
          industryHint: CATEGORIES[number],
          // A studio's own site is from the studio's country; a client's may not be.
          countryHint: number === SELF_PROMOTION ? countryCode(country) : null,
          sourceRef: page,
        };
      }
    }
  }
}
