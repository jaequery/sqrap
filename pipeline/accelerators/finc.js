// Founders, Inc. (f.inc). Its portfolio is a Framer site whose sitemap lists
// one /portfolio/<slug>/ page per company; each page has COMPANY WEBSITE,
// FOUNDED (the company's founding year) and INDUSTRY fields. f.inc publishes no
// cohorts, so `batch` and `year` are null for every company. robots.txt
// welcomes crawlers to the portfolio.
import * as cheerio from "cheerio";
import { fetchHtml } from "../discover/http.js";
import { siteUrl, withDetails } from "./util.js";

const BASE = "https://f.inc";

export const name = "finc";
export const hasCohortYears = false;

// `years` is ignored: there are no cohort years to filter on.
export async function roster() {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const refs = $map("url > loc").map((_, el) => $map(el).text().trim()).get()
    .filter((u) => /^https:\/\/f\.inc\/portfolio\/[^/]+\/?$/.test(u));
  if (!refs.length) throw new Error(`[${name}] no /portfolio/ pages in the sitemap; its format may have changed`);
  return [...new Set(refs)].map((companyUrl) => ({ name: null, batch: null, year: null, companyUrl }));
}

// The value block after a field's label (an <h3> such as "COMPANY WEBSITE").
function field($, label) {
  const h3 = $("h3").filter((_, el) => $(el).text().trim().toUpperCase() === label).first();
  return h3.length ? h3.parent().parent() : null;
}

export async function details(row) {
  const $ = cheerio.load(await fetchHtml(row.companyUrl));
  const site = field($, "COMPANY WEBSITE");
  const industry = field($, "INDUSTRY");
  const oneLiner = $("h1").first().parent().next().text().trim();
  return {
    ...row,
    name: $("h1").first().text().trim() || row.name,
    website: siteUrl(site?.find("a[href^='http']").first().attr("href") ?? site?.find("p").last().text()),
    oneLiner: oneLiner || undefined,
    industryHint: industry ? industry.find("p").map((_, p) => $(p).text().trim()).get().filter(Boolean) : undefined,
  };
}

export async function companies({ log } = {}) {
  return withDetails({ name, details }, await roster(), log);
}
