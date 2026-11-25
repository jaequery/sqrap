// Pafolios (pafolios.com), a hand-picked gallery of about 900 design
// portfolios, one added most days since 2020: product and UX designers, design
// engineers, creative and brand designers, and design studios (Eric Viana,
// Gabriel Valdivia, Two Hands, Fedor Shkliarau, Rachel He). It was noted as not
// adaptable while its grid rendered client-side, but the served home page's
// Next.js flight data now carries every record (title, categories, websiteUrl,
// date, slug), so one request reads the whole gallery. Some designers are
// listed again with a newer portfolio under the same address, so each address
// is yielded once, from its newest record, newest first. Each record's
// /<slug> page is its sourceRef, and every site is tagged Agency & Portfolio.
// robots.txt allows everything.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";
import { flightData, objectAt } from "./catalog.js";

const BASE = "https://pafolios.com";

export const name = "pafolios";

// Every portfolio record in the flight data, newest first, one per address.
export function portfolios(text) {
  const records = [];
  for (const m of text.matchAll(/\{"id":"[^"]+","title":/g)) {
    const r = objectAt(text, m.index);
    const url = typeof r?.websiteUrl === "string" ? r.websiteUrl.trim() : "";
    if (!r?.slug || !/^https?:\/\//i.test(url) || /^https?:\/\/([^/]+\.)?pafolios\.com\b/i.test(url)) continue;
    records.push({ ...r, websiteUrl: url });
  }
  records.sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
  const seen = new Set();
  return records.filter((r) => {
    const key = r.websiteUrl.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function* listing({ limit }) {
  const list = portfolios(flightData(cheerio.load(await fetchHtml(`${BASE}/`))));
  if (!list.length) console.warn(`[${name}] no portfolio records on ${BASE}/; the page data may have changed`);
  for (const r of list.slice(0, limit)) {
    yield {
      url: r.websiteUrl,
      name: r.title?.trim() || null,
      industryHint: "Agency & Portfolio",
      sourceRef: `${BASE}/${encodeURIComponent(r.slug)}`,
    };
  }
}
