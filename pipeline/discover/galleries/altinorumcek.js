// Altın Örümcek (Golden Spider, altinorumcek.com), Turkey's web awards, judged
// by a jury of practitioners every year since 2002. About 30 categories a year
// (banking, e-commerce, education, culture, real estate, health, tourism,
// food, corporate, public bodies, agencies, microsites...) each name a first,
// second and third place plus a public favourite, and the year names its best
// website: Akbank, Yapı Kredi, Turkcell, Pegasus, Koton, İstanbul Modern.
// A year's results are one static page at /<year>/sonuclar/; each award card
// links straight to the site, so nothing else is fetched. Categories that are
// not websites (mobile apps, social media, online advertising and integrated
// campaigns, advergames) are skipped, as are public favourites and the
// accessibility prize (not a design ranking) and links that are not a site
// (app stores, social profiles). Within a year the best website comes first,
// then first, second and third places. Years come from the results page's
// year links, newest first, the latest six read (2015 has none). robots.txt
// allows everything but ?utm links.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

const BASE = "https://altinorumcek.com";
const RESULTS = `${BASE}/sonuclar/`;
const MAX_YEARS = 6;
// Jury placings in the order they are yielded; public favourites (is-public)
// and the accessibility prize (is-accessible) are not read.
const MEDALS = ["is-best", "is-first", "is-second", "is-third"];
// Category slugs (they change a little from year to year) that are not websites.
const NOT_WEBSITES = /uygulama|kampanya|sosyal-medya|online-reklam|advergame/;

export const name = "altinorumcek";

const NOT_A_SITE = /^https?:\/\/([^/]+\.)?(altinorumcek\.com|apps\.apple\.com|itunes\.apple\.com|play\.google\.com|appgallery\.huawei\.com|instagram\.com|facebook\.com|twitter\.com|x\.com|linkedin\.com|youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|behance\.net)\b/i;

// Category slug → lib/taxonomy.js INDUSTRIES; other categories carry no hint.
const INDUSTRY = [
  [/bankacilik|finans|sigorta/, "Finance"],
  [/e-ticaret|perakende|alisveris/, "E-commerce"],
  [/egitim|okul/, "Education"],
  [/eglence|kultur-sanat/, "Entertainment"],
  [/gayrimenkul/, "Real estate"],
  [/saglik/, "Health"],
  [/otomotiv/, "Automotive"],
  [/turizm|otel/, "Travel"],
  [/yiyecek|restoran/, "Food & Drink"],
  [/moda/, "Fashion"],
  [/ajans/, "Agency & Portfolio"],
  [/sosyal-sorumluluk|sivil-toplum/, "Nonprofit"],
  [/haber|magazin/, "Media & Publishing"],
];

const text = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

function asSite(href) {
  let url = text(href).replace(/^h+t+p(s?):\/\//i, "http$1://");
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (!/^https?:\/\/[^/]+\.[^/]+/i.test(url) || NOT_A_SITE.test(url)) return null;
  try {
    return new URL(url).href;
  } catch {
    return null;
  }
}

// The years the results page links (/<year>/sonuclar/, the latest as /<year>/), newest first.
async function years() {
  const $ = cheerio.load(await fetchHtml(RESULTS));
  const found = new Set();
  $("a[href]").each((_, a) => {
    const m = $(a).attr("href").match(/^(?:https?:\/\/(?:www\.)?altinorumcek\.com)?\/(\d{4})\/(?:sonuclar\/)?$/);
    if (m) found.add(Number(m[1]));
  });
  return [...found].sort((a, b) => b - a).slice(0, MAX_YEARS);
}

// A year's website winners, best website first, then by place.
async function winners(year) {
  const page = `${BASE}/${year}/sonuclar/`;
  const $ = cheerio.load(await fetchHtml(page));
  const found = [];
  $("section.ao-results-section[id]").each((_, section) => {
    const category = $(section).attr("id");
    if (NOT_WEBSITES.test(category)) return;
    const industryHint = INDUSTRY.find(([re]) => re.test(category))?.[1] ?? null;
    $(section).find("li.ao-award").each((_, card) => {
      const medals = $(card).find(".ao-medal").get().map((m) => $(m).attr("class") ?? "");
      const rank = Math.min(...medals.map((c) => MEDALS.findIndex((m) => c.split(/\s+/).includes(m))).filter((i) => i >= 0));
      if (!Number.isFinite(rank)) return;
      const url = asSite($(card).find("a.ao-award-site").attr("href"));
      if (!url) return;
      found.push({
        url,
        rank,
        name: text($(card).find("h3").first().text()) || null,
        industryHint,
        countryHint: /\.tr$/i.test(new URL(url).hostname) ? "TR" : null,
        sourceRef: `${page}#${encodeURIComponent(url)}`,
      });
    });
  });
  return { page, sites: found.sort((a, b) => a.rank - b.rank) };
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
    console.warn(`[${name}] no years on ${RESULTS}; the page may have changed`);
    return;
  }
  const seen = new Set();
  let yielded = 0;
  for (const year of all) {
    if (yielded >= limit) return;
    let result;
    try {
      result = await winners(year);
    } catch (err) {
      console.warn(`[${name}] skipping ${year}: ${err.message}`);
      continue;
    }
    if (!result.sites.length) {
      console.warn(`[${name}] no website winners on ${result.page}; the page may have changed`);
      continue;
    }
    for (const { rank, ...site } of result.sites) {
      if (yielded >= limit) return;
      if (seen.has(site.url)) continue;
      seen.add(site.url);
      yielded++;
      yield site;
    }
  }
}
