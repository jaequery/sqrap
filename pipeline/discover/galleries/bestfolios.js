// Bestfolios (bestfolios.com), a hand-picked gallery of designer portfolios
// run since 2017: product and UX designers at tech companies, graphic, brand
// and motion designers (Maurice Moynihan, Elaine Yu, Serg Zorin, Claire Li).
// It was noted as not adaptable because its AngularJS pages render
// client-side, but the app reads its list from /api/portfolios, which answers
// JSON with each portfolio's author, linkURL, categories, authorlink and
// createdTime. The API returns only the newest 100 (folio ids now pass 2,300)
// and ignores paging parameters, so each run reads the latest additions,
// about five a month. Each address is yielded once, newest first; each
// portfolio's /portfolio/<authorlink> page is its sourceRef, and every site is
// tagged Agency & Portfolio. The site serves no robots.txt (its SPA answers
// every path with the app shell), so nothing is disallowed.
import { fetchJson } from "../http.js";

const BASE = "https://www.bestfolios.com";
const API = `${BASE}/api/portfolios`;

export const name = "bestfolios";

// The portfolio records with a site address, newest first, one per address.
export function portfolios(list) {
  if (!Array.isArray(list)) return [];
  const records = list.filter((r) => {
    const url = typeof r?.linkURL === "string" ? r.linkURL.trim() : "";
    return r?.authorlink && (r.feedType ?? "portfolio") === "portfolio" && /^https?:\/\//i.test(url) && !/^https?:\/\/([^/]+\.)?bestfolios\.com\b/i.test(url);
  });
  records.sort((a, b) => String(b.createdTime ?? "").localeCompare(String(a.createdTime ?? "")));
  const seen = new Set();
  return records.filter((r) => {
    const key = r.linkURL.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function* listing({ limit }) {
  const list = portfolios(await fetchJson(API));
  if (!list.length) console.warn(`[${name}] no portfolios from ${API}; its API may have changed`);
  for (const r of list.slice(0, limit)) {
    yield {
      url: r.linkURL.trim(),
      name: r.author?.trim() || null,
      industryHint: "Agency & Portfolio",
      sourceRef: `${BASE}/portfolio/${encodeURIComponent(r.authorlink)}`,
    };
  }
}
