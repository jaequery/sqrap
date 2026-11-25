// Az Év Honlapja (Website of the Year, azevhonlapja.hu), Hungary's website
// awards, run by the Hungarian Marketing Association since 2006. About 30
// categories a year (agriculture, B2B, e-commerce, culture, media, real
// estate, tourism, hospitality, education, municipalities...), each judged by
// a jury that names an "Az Év Honlapja" winner, a quality prize (Minőségi díj)
// and special prizes, plus the year's absolute winner: Billingo, BKK, Müpa,
// Vígszínház, Kifli.hu, Városliget.
// A year's results are one static page (/dijazottak/dijat-nyert-weboldalak-<year>)
// of paragraphs: a bold category heading, then one line per prize linking
// straight to the site, so nothing else is fetched. Only the absolute winner,
// category winners and quality prizes are read; special prizes and the public
// vote are skipped, as are categories that are not website design (apps,
// technology, AI marketing, blockchain) and the one for small businesses'
// first websites. Within a year the absolute winner comes first, then
// category winners, then quality prizes, in page order. Years come from the
// winners index's links, newest first, the latest six read. robots.txt
// allows everything but voting and uploads.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

const BASE = "https://www.azevhonlapja.hu";
const INDEX = `${BASE}/dijazottak`;
const MAX_YEARS = 6;
// Categories whose entries are not a website's design.
const NOT_WEBSITES = /applikáci|technológiai|ai alapú|blockchain|saját honlap/i;

export const name = "azevhonlapja";

const NOT_A_SITE = /^https?:\/\/([^/]+\.)?(azevhonlapja\.hu|apps\.apple\.com|itunes\.apple\.com|play\.google\.com|instagram\.com|facebook\.com|twitter\.com|x\.com|linkedin\.com|youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|behance\.net)\b/i;

// Category heading → lib/taxonomy.js INDUSTRIES; other categories carry no hint.
const INDUSTRY = [
  [/e-kereskedelem|kereskedelem/i, "E-commerce"],
  [/e-learning|oktatás/i, "Education"],
  [/egészségügy/i, "Health"],
  [/ingatlan/i, "Real estate"],
  [/kultúra|művész/i, "Entertainment"],
  [/média/i, "Media & Publishing"],
  [/non-profit/i, "Nonprofit"],
  [/turizmus/i, "Travel"],
  [/vendéglátás/i, "Food & Drink"],
  [/portfólió/i, "Agency & Portfolio"],
  [/közösségi/i, "Community & Social"],
];

const text = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

function asSite(href) {
  const url = text(href);
  if (!/^https?:\/\/[^/]+\.[^/]+/i.test(url) || NOT_A_SITE.test(url)) return null;
  try {
    return new URL(url).href;
  } catch {
    return null;
  }
}

// Which prize a line names: 0 absolute winner, 1 category winner, 2 quality prize, else null.
function prize(label) {
  if (/abszolút/i.test(label)) return 0;
  if (/különdíj|közönségdíj|applikáció/i.test(label)) return null;
  if (/minőségi díj/i.test(label)) return 2;
  if (/az év (honlapja|kreatív megoldása)/i.test(label)) return 1;
  return null;
}

// The years the winners index links, newest first.
async function years() {
  const $ = cheerio.load(await fetchHtml(INDEX));
  const found = new Map();
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href");
    let path;
    try {
      path = decodeURIComponent(new URL(href, BASE).pathname);
    } catch {
      return;
    }
    const m = path.match(/^\/dijazottak\/[^/]*-(\d{4})$/);
    if (m && !found.has(Number(m[1]))) found.set(Number(m[1]), new URL(href, BASE).href);
  });
  return [...found].sort((a, b) => b[0] - a[0]).slice(0, MAX_YEARS);
}

// A year's winners, absolute winner first, then category winners, then quality prizes.
async function winners(page) {
  const $ = cheerio.load(await fetchHtml(page));
  const found = [];
  let category = "";
  let heading = "";
  $("article.szoveg div.szoveg p").each((_, p) => {
    const line = text($(p).text());
    if (!line) return;
    const links = $(p).find("a[href]");
    if (!links.length) {
      // A bold heading such as "Agrár kategória:" starts a category; others
      // ("Közönségdíj:", the absolute winner) name the prize of the next line.
      heading = line.replace(/:$/, "");
      if (/kategória/i.test(heading)) category = heading;
      return;
    }
    const rank = prize(line) ?? (heading === category ? null : prize(heading));
    if (rank === null || (rank > 0 && NOT_WEBSITES.test(category))) return;
    const url = links.get().map((a) => asSite($(a).attr("href"))).find(Boolean);
    if (!url) return;
    const title = text($(links[0]).text()).replace(/^[’'‘]Az Év Honlapja[’'‘]:\s*/i, "");
    found.push({
      url,
      rank,
      name: title.split(/\s+[-–—|]\s+/)[0] || null,
      industryHint: rank > 0 ? INDUSTRY.find(([re]) => re.test(category))?.[1] ?? null : null,
      countryHint: /\.hu$/i.test(new URL(url).hostname) ? "HU" : null,
      sourceRef: `${page}#${encodeURIComponent(url)}`,
    });
  });
  // Stable sort keeps page order within a prize.
  return found.sort((a, b) => a.rank - b.rank);
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
    console.warn(`[${name}] no years on ${INDEX}; the page may have changed`);
    return;
  }
  const seen = new Set();
  let yielded = 0;
  for (const [year, page] of all) {
    if (yielded >= limit) return;
    let sites;
    try {
      sites = await winners(page);
    } catch (err) {
      console.warn(`[${name}] skipping ${year}: ${err.message}`);
      continue;
    }
    if (!sites.length) {
      console.warn(`[${name}] no website winners on ${page}; the page may have changed`);
      continue;
    }
    for (const { rank, ...site } of sites) {
      if (yielded >= limit) return;
      if (seen.has(site.url)) continue;
      seen.add(site.url);
      yielded++;
      yield site;
    }
  }
}
