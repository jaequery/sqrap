// Delightful (delightful.click), a hand-picked library of design references
// (about 5,800 in all, November 2026 on: identity, illustration, motion, product
// UI and web) from about 1,600 brands, each entry tiered S or A by its editors.
// Its client-rendered library loads one /index.json with every entry (brand,
// source link, category, tags, tier, captured_at), so one request reads the
// whole library. Only the web categories are read (web-heroes, web-pages,
// web-sections, about 520 entries). Most link to the brand's own site; entries
// clipped from Mobbin or X are refused by the blocklist, and agency case-study
// pages about a client (a credited entry whose link is a deeper page, such as
// wearecollins.com/case-studies/...) are skipped, since their host is the
// agency and not the brand. Each host is yielded once, most recently captured
// first, the item's library page kept as the sourceRef. A brand name is only
// given to an entry that links to a site's home page (stripe.com/sessions is
// "Stripe Sessions", not stripe.com). robots.txt allows everything but /api/,
// /auth/ and account pages.
import { fetchJson } from "../http.js";

const BASE = "https://delightful.click";

export const name = "delightful";

const WEB = new Set(["web-heroes", "web-pages", "web-sections"]);

// Delightful's sector tags to Sqrap industries, the first that matches wins.
const INDUSTRY = [
  ["ai", "AI"],
  ["devtools", "Developer tools"],
  ["infra", "Developer tools"],
  ["fintech", "Finance"],
  ["crypto", "Crypto"],
  ["health", "Health"],
  ["commerce", "E-commerce"],
  ["fashion", "Fashion"],
  ["food", "Food & Drink"],
  ["music", "Music"],
  ["games", "Entertainment"],
  ["productivity", "Productivity"],
  ["media", "Media & Publishing"],
  ["agency", "Agency & Portfolio"],
  ["studio", "Agency & Portfolio"],
  ["portfolio", "Agency & Portfolio"],
];

// The library's entries to { url, name, industry, sourceRef }, one per host,
// most recently captured first.
export function websites(entries) {
  if (!Array.isArray(entries)) return [];
  const list = [];
  for (const e of entries) {
    if (!WEB.has(e?.category) || typeof e.source !== "string") continue;
    let u;
    try {
      u = new URL(e.source.trim());
    } catch {
      continue;
    }
    if (!/^https?:$/.test(u.protocol) || /(^|\.)delightful\.click$/i.test(u.hostname)) continue;
    const home = u.pathname.replace(/\/+$/, "") === "";
    if (!home && String(e.credit ?? "").trim()) continue;
    const tags = Array.isArray(e.tags) ? e.tags : [];
    list.push({
      url: home ? u.origin + "/" : u.href,
      name: home ? String(e.brand ?? "").trim() || null : null,
      industry: INDUSTRY.find(([t]) => tags.includes(t))?.[1],
      sourceRef: typeof e.id === "string" && e.id ? `${BASE}/library/#/item/${encodeURIComponent(e.id)}` : `${BASE}/library/`,
      // Home-page entries first among a host's entries, so its name is kept.
      rank: home ? 0 : 1,
      date: String(e.captured_at ?? ""),
    });
  }
  list.sort((a, b) => b.date.localeCompare(a.date));
  const best = new Map();
  for (const r of list) {
    const key = new URL(r.url).hostname.toLowerCase().replace(/^www\./, "");
    const prev = best.get(key);
    if (!prev) best.set(key, r);
    else if (r.rank < prev.rank) best.set(key, { ...r, date: prev.date });
  }
  return [...best.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export async function* listing({ limit = Infinity } = {}) {
  const indexUrl = `${BASE}/index.json`;
  const list = websites(await fetchJson(indexUrl));
  if (!list.length) console.warn(`[${name}] no web entries in ${indexUrl}; its data may have changed`);
  for (const r of list.slice(0, limit)) {
    yield { url: r.url, name: r.name, industryHint: r.industry, sourceRef: r.sourceRef };
  }
}
