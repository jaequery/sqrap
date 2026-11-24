// Tagline Awards (tagline.ru/awards), the annual digital awards of Tagline,
// Russia's digital industry magazine, judged by a jury of practitioners since
// 2008. Its "Сайты" (websites) group names gold, silver and bronze winners in
// about 30 categories a year (corporate, promo, retail, culture, education,
// real estate, finance, media, government...), 160 to 280 sites a year: Avito,
// VDNKh, the Sakharov Center, Tsvetnoy, Soyuzmultfilm, Yandex. A year's winners
// are one static page at /awards/winners/<year>/; each card names the site
// right under the case title, then the agency and the client, so nothing else
// is fetched. Shortlisted cards (.js-shortlist) are skipped, as are categories
// that are not about a site's design (online games, highload, development and
// integration) and links that are not a site (videos, app stores, Behance,
// case-study pages on an agency's own site or a case host). Within a year gold comes first, then silver,
// then bronze. Pages from before 2019 use another layout and are not read;
// 2020 and 2021 share one page, and 2023 has none. robots.txt allows the
// winners pages (it disallows /news, /archive/ and ?nomination= links).
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

const BASE = "https://tagline.ru";
const WINNERS = `${BASE}/awards/winners`;
const FIRST_YEAR = 2019;
const MAX_YEARS = 8;
const SECTION = "sites";
const METALS = ["Золото", "Серебро", "Бронза"];

export const name = "tagline";

// Categories about games, load or back-end work rather than a site's design.
const NOT_DESIGN = /онлайн-игра|highload|разработка \/ интеграция/i;

const NOT_A_SITE = /^https?:\/\/([^/]+\.)?(tagline\.ru|vimeo\.com|youtube\.com|youtu\.be|rutube\.ru|vk\.com|vkvideo\.ru|t\.me|behance\.net|dribbble\.com|apps\.apple\.com|play\.google\.com|rustore\.ru|appgallery\.huawei\.com|disk\.yandex\.ru|drive\.google\.com|figma\.com|instagram\.com|facebook\.com|dsgners\.ru)\b/i;
// Case-study hosts agencies put a project's presentation on (zkr.ava-case.com).
const CASE_HOST = /^https?:\/\/([^/]+[.-])?cases?[.-]/i;

// Category name (lowercased) → lib/taxonomy.js INDUSTRIES; others carry no hint.
const INDUSTRY = [
  [/образовательн/, "Education"],
  [/искусств|культур|развлечени/, "Entertainment"],
  [/авто- и мото/, "Automotive"],
  [/сообществ/, "Community & Social"],
  [/недвижимост/, "Real estate"],
  [/маркетплейс|ритейл/, "E-commerce"],
  [/финансов/, "Finance"],
  [/медицин/, "Health"],
  [/медиа|сми/, "Media & Publishing"],
];

const text = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

function asSite(href) {
  let url = text(href);
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (!/^https?:\/\/[^/]+\.[^/]+/i.test(url) || NOT_A_SITE.test(url) || CASE_HOST.test(url)) return null;
  try {
    return new URL(url).href;
  } catch {
    return null;
  }
}

const hostOf = (url) => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
};

// A card's credit line, after the site link: "<agency>, <client>" (a line
// without a comma names only the agency). Returns the client and the agencies'
// hosts.
function credits($, caseEl) {
  const lines = ($(caseEl).html() ?? "").split(/<br\s*\/?>/i);
  const at = lines.findIndex((l) => /<a\b[^>]*\btitle=/i.test(l));
  const $line = cheerio.load(`<p>${at >= 0 ? (lines[at + 1] ?? "") : ""}</p>`);
  const line = text($line("p").text());
  const agencies = $line("a[href]").get().map((a) => hostOf($line(a).attr("href"))).filter(Boolean);
  const client = line && !/^соавторы/i.test(line) && line.includes(",") ? text(line.slice(line.lastIndexOf(",") + 1)) || null : null;
  return { client, agencies };
}

// A project presented on the entrant agency's own site (mebel.pitcher.agency,
// artlebedev.ru/585-zolotoy/site/) rather than the client's.
function onAgencySite(url, agencies) {
  const host = hostOf(url);
  const path = new URL(url).pathname.replace(/\/+$/, "");
  return agencies.some((a) => host.endsWith(`.${a}`) || (host === a && path !== ""));
}

// A year's website winners, gold first, or null when the year has no page.
async function winners(year) {
  const page = `${WINNERS}/${year}/`;
  const html = await fetchHtml(page);
  const $ = cheerio.load(html);
  const title = text($("title").first().text());
  const found = [];
  let section = null;
  $(".b-winners_h1[id], .b-sub-nomintaions").each((_, el) => {
    const block = $(el);
    if (block.is("[id]")) {
      section = block.attr("id");
      return;
    }
    if (section !== SECTION) return;
    const category = text(block.find("h2").first().text());
    if (!category || NOT_DESIGN.test(category)) return;
    block.find(".b-cw-wrap").not(".js-shortlist").each((_, card) => {
      const metal = METALS.indexOf($(card).find(".b-cw-wrap__metal img").attr("alt"));
      if (metal < 0) return;
      const caseEl = $(card).find(".b-bc-wrap__case").first();
      const url = asSite(caseEl.find("a[title]").first().attr("href"));
      if (!url) return;
      const { client, agencies } = credits($, caseEl);
      if (onAgencySite(url, agencies)) return;
      const ref = caseEl.find("b a[href]").first().attr("href");
      found.push({
        url,
        metal,
        name: client,
        industryHint: INDUSTRY.find(([re]) => re.test(category.toLowerCase()))?.[1] ?? null,
        sourceRef: ref ? new URL(ref, BASE).href : `${page}#${encodeURIComponent(url)}`,
      });
    });
  });
  return { title, page, sites: found.sort((a, b) => a.metal - b.metal) };
}

export async function* listing({ limit }) {
  const latest = new Date().getUTCFullYear();
  const seenTitles = new Set();
  const seenUrls = new Set();
  let yielded = 0;
  let pages = 0;
  for (let year = latest; year >= FIRST_YEAR && year > latest - MAX_YEARS; year--) {
    if (yielded >= limit) return;
    let result;
    try {
      result = await winners(year);
    } catch (err) {
      // Not every year has a page (2023 answers 400, the running year 404).
      if (!/HTTP 4\d\d/.test(err.message)) console.warn(`[${name}] skipping ${year}: ${err.message}`);
      continue;
    }
    // 2020 and 2021 serve the same combined page.
    if (result.title && seenTitles.has(result.title)) continue;
    seenTitles.add(result.title);
    pages++;
    if (!result.sites.length) {
      console.warn(`[${name}] no website winners on ${result.page}; the page may have changed`);
      continue;
    }
    for (const site of result.sites) {
      if (yielded >= limit) return;
      if (seenUrls.has(site.url)) continue;
      seenUrls.add(site.url);
      yielded++;
      yield { url: site.url, name: site.name, industryHint: site.industryHint, sourceRef: site.sourceRef };
    }
  }
  if (!pages) console.warn(`[${name}] no winners pages under ${WINNERS}; the site may have changed`);
}
