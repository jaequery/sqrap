// The gallery the German Design Council runs for each of its awards (the
// German Design Award, the German Brand Award): a gallery page that is a shell
// whose cards come from a JSON filter route (its URL, award, detail page id and
// hash are attributes on the list); a filter of year and category answers the
// cards as HTML, 48 a page. Each winner's page credits the customer and the
// designer with links to their sites, so one page is fetched per new site:
// - a site named in the title ("Microsite www.e-motor-power.com") wins;
// - else the customer's link, when it is not one of the designers' sites;
// - else, when customer and designer share a site, it is the entrant's own
//   site only if the title names it; otherwise an agency entered a client's
//   site and links only itself, and the entry is skipped.
// Years come from the filter's answer, newest first, the latest six read.
// robots.txt allows the gallery and its filter route on both awards' sites.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { allowedByRobots, fetchHtml, fetchJson } from "../http.js";

const MAX_YEARS = 6;
const MAX_PAGES = 10;
const P = "tx_lnscelumarticles_articlelist";

const CASE_STUDY = /\/(work|works|projects?|projekte|referenzen|case-stud(y|ies)|portfolio|cases?)\/./i;
const STAGING = /(^|\.)(staging|stage|dev)\./i;
const NOT_A_SITE = /^https?:\/\/([^/]+\.)?(german-design-award\.com|german-brand-award\.com|german-design-council\.de|instagram\.com|linkedin\.com|facebook\.com|behance\.net|vimeo\.com|youtube\.com)\b/i;
const IN_TITLE = /\b((?:https?:\/\/)?www\.[a-z0-9-]+(?:\.[a-z0-9-]+)+)/i;

const text = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const letters = (s) => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function asSite(href) {
  let url = text(href);
  if (/^www\./i.test(url)) url = `https://${url}`;
  if (!/^https?:\/\/[^/]+\.[^/]+/i.test(url) || NOT_A_SITE.test(url)) return null;
  const parsed = new URL(url);
  if (STAGING.test(parsed.hostname)) return null;
  // Some entrants type the host with a trailing dot.
  parsed.hostname = parsed.hostname.replace(/\.$/, "");
  return parsed.href;
}

// The site a winner's page stands for, and whether it is the studio's own.
async function siteOf(page) {
  const $ = cheerio.load(await fetchHtml(page));
  const title = text($("h1").first().text());
  const fromTitle = title.match(IN_TITLE)?.[1];
  if (fromTitle) {
    const url = asSite(fromTitle);
    return url ? { url, own: false } : null;
  }
  const links = (sel) => $(sel).find("a[href]").get().map((a) => ({ url: asSite($(a).attr("href")), name: text($(a).text()) })).filter((l) => l.url);
  const customers = links(".company-credits");
  const designerHosts = new Set(links(".designer-credits").map((l) => hostOf(l.url)));
  const customer = customers[0];
  if (!customer) return null;
  const host = hostOf(customer.url);
  if (!designerHosts.has(host)) {
    return CASE_STUDY.test(new URL(customer.url).pathname) ? null : { url: customer.url, own: false };
  }
  // Customer and designer are the same studio: keep it only when the entry is
  // the studio's own site (the title names the studio or its domain).
  const label = letters(host.split(".").slice(0, -1).join(""));
  const studio = letters(customer.name.replace(/\b(gmbh|ag|ug|kg|co|sp\. z o\.o\.|ltd|llc|inc|s\.?a\.?|b\.?v\.?)\b\.?/gi, ""));
  const named = letters(title);
  const own = (label.length >= 3 && named.includes(label)) || (studio.length >= 3 && named.length >= 3 && (named.includes(studio) || studio.includes(named)));
  return own ? { url: customer.url, own: true, name: customer.name } : null;
}

// The filter route and its fixed parameters, read from the gallery's list.
async function filterRoute({ base, award, mainCategory, subCategory }) {
  const $ = cheerio.load(await fetchHtml(`${base}/en/gallery`));
  const list = $('[data-type="project-list"]').first();
  const route = list.attr("data-filter-route");
  if (!route) return null;
  const url = new URL(route, base);
  url.searchParams.set(`${P}[action]`, "filter");
  url.searchParams.set(`${P}[award]`, list.attr("data-award") || award);
  url.searchParams.set(`${P}[detailPid]`, list.attr("data-detail-page") || "0");
  url.searchParams.set(`${P}[latestYear]`, list.attr("data-latest-year") || "9999");
  url.searchParams.set(`${P}[hash]`, list.attr("data-hash") || "");
  url.searchParams.set(`${P}[layout]`, list.attr("data-layout") || "award-cards");
  url.searchParams.set(`${P}[itemsPerPage]`, list.attr("data-items-per-page") || "48");
  url.searchParams.set(`${P}[mainCategory]`, mainCategory);
  url.searchParams.set(`${P}[subCategory]`, subCategory);
  return url;
}

async function filter(route, { year, page }) {
  const url = new URL(route);
  if (year) url.searchParams.set(`${P}[year]`, String(year));
  url.searchParams.set(`${P}[page]`, String(page));
  if (!(await allowedByRobots(url.href))) throw new Error(`robots.txt disallows ${url.href}`);
  return fetchJson(url.href);
}

// The winner cards of one answer: { page, title }.
function cards(html, { base, subCategory }) {
  const $ = cheerio.load(html ?? "");
  return $('[data-type="project-item"]').get()
    .filter((el) => $(el).attr("data-subcategory") === subCategory)
    .map((el) => ({
      page: new URL($(el).find("a[href]").first().attr("href") ?? "", base).href,
      title: text($(el).find(".project-name").text()),
    }))
    .filter((c) => c.page.startsWith(`${base}/en/gallery/detail/`));
}

// An adapter's listing for one award's category. `ownSiteHint` is the
// industry of an entry whose customer and designer are one: a studio's own
// site at the German Design Award, a brand's in-house work at the Brand Award.
export function councilListing(name, { base, award, mainCategory, subCategory, ownSiteHint = null }) {
  const config = { base, award, mainCategory, subCategory };
  return async function* listing({ limit }) {
    let route, years;
    try {
      route = await filterRoute(config);
      if (route) years = (await filter(route, { page: 1 })).years;
    } catch (err) {
      console.warn(`[${name}] skipping: ${err.message}`);
      return;
    }
    if (!route || !Array.isArray(years) || !years.length) {
      console.warn(`[${name}] no filter route or years on the gallery page; its format may have changed`);
      return;
    }
    years = years.map(Number).filter((y) => y > 2000).sort((a, b) => b - a).slice(0, MAX_YEARS);
    const seen = new Set();
    let yielded = 0;
    for (const year of years) {
      for (let page = 1; page <= MAX_PAGES; page++) {
        let answer;
        try {
          answer = await filter(route, { year, page });
        } catch (err) {
          console.warn(`[${name}] skipping ${year} page ${page}: ${err.message}`);
          break;
        }
        // An unknown page answers the first again; stop at a page we have seen.
        const entries = cards(answer.html, config);
        if (!entries.length || entries.every((e) => seen.has(e.page))) break;
        const known = await knownSourceRefs(entries.map((e) => e.page));
        for (const { page: ref, title } of entries) {
          if (yielded >= limit) return;
          if (seen.has(ref)) continue;
          seen.add(ref);
          if (known.has(ref)) continue;
          let site;
          try {
            site = await siteOf(ref);
          } catch (err) {
            console.warn(`[${name}] skipping ${ref}: ${err.message}`);
            continue;
          }
          if (!site) continue;
          yielded++;
          yield {
            url: site.url,
            name: site.own ? site.name || title || null : null,
            industryHint: site.own ? ownSiteHint : null,
            sourceRef: ref,
          };
        }
        if (entries.length < Number(answer.itemsPerPage || 48)) break;
      }
    }
  };
}
