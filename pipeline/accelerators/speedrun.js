// a16z speedrun (speedrun.a16z.com). Its company directory is a Next.js page
// whose __NEXT_DATA__ lists one cohort at a time (`?cohort=SR007`; the cohort
// list is in `options.cohorts`). Websites are only on each company's page
// (/companies/<slug>, `pageProps.company.websiteUrl`). No robots.txt (404).
import { fetchHtml } from "../discover/http.js";
import { siteUrl, withDetails } from "./util.js";

const BASE = "https://speedrun.a16z.com";

export const name = "speedrun";
export const hasCohortYears = true;

// Cohort years from a16z's own pages, checked 2026-11-26:
//   SR004: "join ... starting January 2025" (speedrun's SR004 call for
//          applications) and Demo Day "fast approaching" in a16z.com/meet-the-new-a16z-speedrun/ (March 12, 2025)
//   SR005: "Program kicks off July 28th and runs through October 10th, 2025"
//          (a16z.com/applications-for-sr005-are-officially-open/)
//   SR006: "Our upcoming Winter/Spring cohort (SR006) runs from late January
//          through April 2026" (a16z.com/a16z-speedrun-application-winter-spring-2026/)
//   SR007: "Our Summer/Fall residency (SR007) ran from July 27 through October
//          11, 2026" (a16z.com/applications-for-a16z-speedrun-sr007-are-now-open/)
// SR001 to SR003 are not dated on a16z's or speedrun's pages, so they stay null.
// Later cohorts are read from speedrun's FAQ ("SR008 starts in February 2027").
const KNOWN_YEARS = Object.freeze({ SR004: 2025, SR005: 2025, SR006: 2026, SR007: 2026 });

function nextData(html, url) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error(`no __NEXT_DATA__ in ${url}; the page may have changed`);
  return JSON.parse(m[1]).props?.pageProps ?? {};
}

// { SR008: 2027, ... } from FAQ sentences like "SR009 starts in late July 2027"
// or "The SR008 residency runs February 1 to April 18, 2027".
export function faqYears(text) {
  const years = {};
  for (const sentence of String(text).split(/(?<=\.)\s/)) {
    const m = sentence.match(/\b(SR\d{3})\b[^.]*?\b(?:starts|started|runs|ran)\b[^.]*?\b(20\d{2})\b/);
    if (m && !years[m[1]]) years[m[1]] = Number(m[2]);
  }
  return years;
}

async function cohortYears() {
  let fromFaq = {};
  try {
    fromFaq = faqYears((await fetchHtml(`${BASE}/faq`)).replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
  } catch (err) {
    console.warn(`[${name}] could not read the FAQ for new cohorts' years: ${err.message}`);
  }
  return { ...fromFaq, ...KNOWN_YEARS };
}

export async function roster({ years } = {}) {
  const first = nextData(await fetchHtml(`${BASE}/companies`), `${BASE}/companies`);
  const cohorts = first.options?.cohorts;
  if (!Array.isArray(cohorts) || !cohorts.length) throw new Error(`[${name}] no cohort list on /companies; the page may have changed`);
  const yearOf = await cohortYears();
  const rows = [];
  for (const cohort of cohorts) {
    const year = yearOf[cohort] ?? null;
    if (years && !years.includes(year)) continue;
    const url = `${BASE}/companies?cohort=${encodeURIComponent(cohort)}`;
    const list = nextData(await fetchHtml(url), url).list ?? {};
    const companies = Array.isArray(list.companies) ? list.companies : [];
    if (list.total > companies.length) console.warn(`[${name}] ${cohort} lists ${companies.length} of ${list.total} companies`);
    for (const c of companies) {
      if (!c?.slug || !c.name) continue;
      rows.push({
        name: c.name,
        batch: c.cohort || cohort,
        year,
        companyUrl: `${BASE}/companies/${encodeURIComponent(c.slug)}`,
        oneLiner: c.oneLiner || undefined,
        industryHint: Array.isArray(c.industries) ? c.industries : undefined,
      });
    }
  }
  return rows;
}

export async function details(row) {
  const company = nextData(await fetchHtml(row.companyUrl), row.companyUrl).company;
  return { ...row, website: siteUrl(company?.websiteUrl) };
}

export async function companies({ years, log } = {}) {
  return withDetails({ name, details }, await roster({ years }), log);
}
