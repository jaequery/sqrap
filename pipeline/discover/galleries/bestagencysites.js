// Best Agency Sites (bestagencysites.com), a gallery of agency and studio
// websites run since 2010 by MadeByShape: Unseen Studio, Instrument, Yuga,
// Fieldwork, Kogan Design, Babylone. Its /websites listing is served as HTML,
// newest first, 24 cards a page paged with /websites/p<n> (about 17 pages,
// roughly 390 sites); each card's Visit link goes straight to the site with
// ?ref=bestagencysites.com (which normalizing drops) and its View link to a
// detail page, the sourceRef, so no page per site is fetched. Past the last page
// the site serves the last page again, which ends the read; a page that fails
// (page 12 answers HTTP 500) is skipped rather than ending it, which is why the
// adapter does not use the shared paged() loop, whose cursor would stop on it
// every run. The whole listing is a few seconds of requests, so each run reads
// it from the start and skips sites already stored by domain or detail page.
// Every entry is an agency or studio site, so architecture and interior studios
// map to Architecture & Interior and the rest to Agency & Portfolio. Its
// /directory of about 1,300 UK agencies is a listing, not a curated gallery, and
// is not read.
import * as cheerio from "cheerio";
import { knownDomains, knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";
import { candidateDomain } from "../normalize.js";

const BASE = "https://bestagencysites.com";
const MAX_PAGES = 40;
// Consecutive failed pages after which the gallery is taken to be down.
const MAX_FAILURES = 3;

export const name = "bestagencysites";

const pageUrl = (n) => `${BASE}/websites${n > 1 ? `/p${n}` : ""}`;

const industryOf = (slug) =>
  slug === "architecture" || slug === "interior" ? "Architecture & Interior" : "Agency & Portfolio";

export function parse($) {
  return $("div[x-data='{ overlay: false }']").map((_, el) => {
    const card = $(el);
    const url = card.find("a[href^='http'][href*='ref=bestagencysites.com']").attr("href");
    const detail = card.find(`a[href^='${BASE}/websites/']`)
      .map((_, a) => $(a).attr("href")).get()
      .find((href) => /^https:\/\/bestagencysites\.com\/websites\/[a-z0-9-]+$/.test(href));
    if (!url || !detail) return null;
    const industry = card.find(`a[href^='${BASE}/websites/industry/']`).first();
    const slug = industry.attr("href")?.split("/").pop() ?? null;
    // The card's text is its two button labels, then the name and the industry.
    const text = card.text().replace(/\s+/g, " ").replace(/^(View ?)+(Visit ?)+/, "").trim();
    const label = industry.text().trim();
    const siteName = label && text.endsWith(label) ? text.slice(0, -label.length).trim() : text;
    return { url, name: siteName || null, industryHint: industryOf(slug), sourceRef: detail };
  }).get();
}

export async function* listing({ limit }) {
  let yielded = 0;
  let previous = null;
  let failures = 0;
  for (let page = 1; page <= MAX_PAGES && yielded < limit; page++) {
    const url = pageUrl(page);
    let entries;
    try {
      entries = parse(cheerio.load(await fetchHtml(url)));
      failures = 0;
    } catch (err) {
      console.warn(`[${name}] skipping ${url}: ${err.message}`);
      if (++failures >= MAX_FAILURES) return;
      continue;
    }
    if (!entries.length) {
      if (page === 1) console.warn(`[${name}] no entries on ${url}; the gallery markup may have changed`);
      return;
    }
    // Past the last page the site serves the last page again.
    const key = entries.map((e) => e.sourceRef).join("\n");
    if (key === previous) return;
    previous = key;
    const [knownDoms, knownRefs] = await Promise.all([
      knownDomains(entries.map((e) => candidateDomain(e.url)).filter(Boolean)),
      knownSourceRefs(entries.map((e) => e.sourceRef)),
    ]);
    for (const entry of entries) {
      if (yielded >= limit) return;
      if (knownDoms.has(candidateDomain(entry.url)) || knownRefs.has(entry.sourceRef)) continue;
      yielded++;
      yield entry;
    }
  }
}
