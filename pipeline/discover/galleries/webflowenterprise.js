// Webflow Enterprise Partners: the top tier of Webflow's Certified Partners
// directory (experts.webflow.com/browse), the studios Webflow trusts with its
// enterprise customers (Finsweet, Refokus, Edgar Allan, Noomo, OFF+BRAND,
// tonik, Baunfire...). The directory lists about 2,100 partners, 10 a page via
// `?5b5090bd_page=<n>` (about 210 pages); most are Certified or Premium partners
// (largely marketing agencies and freelancers), so only cards marked
// "Enterprise" are kept, about 170, spread over every page. A card names the
// partner's country and links to its webflow.com/@<slug> profile, kept as the
// sourceRef; the profile's embedded data names the partner's own site, so one
// profile is fetched per new partner. Every site is tagged Agency & Portfolio.
// The Enterprise filter on the page runs client-side, so every listing page is
// read; like the shared paging loop, a run reads page 1, then resumes at the
// page an earlier run reached. robots.txt allows all of experts.webflow.com and
// webflow.com/@ profiles.
import * as cheerio from "cheerio";
import { galleryCursor, knownSourceRefs, setGalleryCursor } from "../../../lib/db.js";
import { countryCode } from "../country.js";
import { fetchHtml } from "../http.js";

const BROWSE = "https://experts.webflow.com/browse";
const PROFILE = /^https:\/\/webflow\.com\/@[\w-]+$/;

export const name = "webflow-enterprise";

const pageUrl = (n) => (n > 1 ? `${BROWSE}?5b5090bd_page=${n}` : BROWSE);

// The Enterprise cards on a listing page, and whether a next page follows.
export function parsePage($) {
  const cards = [];
  for (const el of $(".experts-item").toArray()) {
    const card = $(el);
    const enterprise = card.find(".experts-item_enterprise-distinction-wrapper").not(".w-condition-invisible");
    if (!enterprise.length) continue;
    const profile = card.find("a.experts-item_link").first().attr("href")?.replace(/\/$/, "");
    if (!profile || !PROFILE.test(profile)) continue;
    cards.push({
      profile,
      name: card.find(".experts-item_name").first().text().trim() || null,
      country: card.find(".experts-item_location.cc-country").first().text().trim() || null,
    });
  }
  return { cards, count: $(".experts-item").length, more: $(".w-pagination-next").length > 0 };
}

// The partner's own site from its profile's embedded data, or null.
export function websiteFrom(html) {
  const m = html.match(/"website":("(?:[^"\\]|\\.)*")/);
  if (!m) return null;
  try {
    const url = JSON.parse(m[1]).trim();
    return /^https?:\/\//i.test(url) ? url : url ? `https://${url}` : null;
  } catch {
    return null;
  }
}

export async function* listing({ limit }) {
  // Without the gallery_cursors table (003 not migrated yet) every run starts at page 2.
  const cursor = await galleryCursor(name).catch((err) => {
    console.warn(`[${name}] no paging cursor, reading from the start: ${err.message}`);
    return undefined;
  });
  let yielded = 0;
  let previous = null;
  for (let page = 1; page <= 400 && yielded < limit; page = page === 1 ? Math.max(2, cursor ?? 2) : page + 1) {
    const url = pageUrl(page);
    const { cards, count, more } = parsePage(cheerio.load(await fetchHtml(url)));
    if (!count) {
      if (page === 1) console.warn(`[${name}] no partner cards on ${url}; the directory markup may have changed`);
      return;
    }
    // Past the last page the directory may serve the last page again.
    const key = cards.map((c) => c.profile).join("\n") || `#${count}`;
    if (key === previous && cards.length) return;
    previous = key;
    if (page > 1 && cursor !== undefined && page !== cursor) await setGalleryCursor(name, page);
    const known = await knownSourceRefs(cards.map((c) => c.profile));
    for (const card of cards) {
      if (yielded >= limit) return;
      if (known.has(card.profile)) continue;
      let site;
      try {
        site = websiteFrom(await fetchHtml(card.profile));
      } catch (err) {
        console.warn(`[${name}] skipping ${card.profile}: ${err.message}`);
        continue;
      }
      if (!site) continue;
      yielded++;
      yield {
        url: site,
        name: card.name,
        industryHint: "Agency & Portfolio",
        countryHint: countryCode(card.country),
        sourceRef: card.profile,
      };
    }
    if (!more) return;
  }
}
