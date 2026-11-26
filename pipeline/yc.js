// Y Combinator batches for the sites in the library, from the public yc-oss
// mirror of YC's company directory (every batch, not only the current one).
// A site is a YC company when its domain equals the normalized hostname of a
// company's website: exact match only, never a parent domain or a fuzzy name.
// Run daily from the cron (app/api/cron/pipeline) and by `npm run yc:sync`.
import { normalizeDomain, setYcMatches } from "../lib/db.js";

export const YC_SOURCE = "https://yc-oss.github.io/api/companies/all.json";
const SEASONS = { winter: "W", spring: "X", summer: "S", fall: "F" };
const SEASON_ORDER = { W: 1, X: 2, S: 3, F: 4 };

// "Winter 2026" -> "W26", "Spring 2025" -> "X25". Null for anything else
// (yc-oss lists a few companies as "Unspecified").
export function batchLabel(batch) {
  const m = /^\s*(winter|spring|summer|fall)\s+(\d{4})\s*$/i.exec(String(batch || ""));
  return m ? `${SEASONS[m[1].toLowerCase()]}${m[2].slice(2)}` : null;
}

// Sortable rank of a label: later batches rank higher; null ranks lowest.
const batchRank = (label) => (label ? Number(`20${label.slice(1)}`) * 10 + SEASON_ORDER[label[0]] : -1);

// "https://www.Example.com/about" -> "example.com"; null when not an http(s) URL.
export function websiteDomain(website) {
  if (!website) return null;
  try {
    const u = new URL(/^[a-z][\w+.-]*:\/\//i.test(website) ? website : `https://${website}`);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return normalizeDomain(u.hostname) || null;
  } catch {
    return null;
  }
}

// One row per domain from the yc-oss company list. When two companies share a
// domain (a rename, say), the latest batch wins.
export function ycRows(companies, log = () => {}) {
  const byDomain = new Map();
  let unknown = 0;
  for (const c of companies) {
    const domain = websiteDomain(c?.website);
    if (!domain) continue;
    const batch = batchLabel(c.batch);
    if (!batch) unknown++;
    const url = typeof c.url === "string" && /^https:\/\/(www\.)?ycombinator\.com\//.test(c.url) ? c.url : null;
    const prev = byDomain.get(domain);
    if (!prev || batchRank(batch) > batchRank(prev.batch)) byDomain.set(domain, { domain, batch, url });
  }
  if (unknown) log(`yc: ${unknown} companies with an unknown batch format, stored without a batch`);
  return [...byDomain.values()];
}

// Fetches the list and stores the matches. Throws, and changes nothing, when
// the mirror is unreachable or its shape is not what we expect.
export async function syncYc({ signal, log = () => {} } = {}) {
  const res = await fetch(YC_SOURCE, { signal, headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`yc-oss answered ${res.status}`);
  const companies = await res.json();
  if (!Array.isArray(companies) || companies.length < 1000 || !companies.some((c) => c?.website && c?.batch)) {
    throw new Error("yc-oss returned an unexpected shape; leaving YC batches as they are");
  }
  const rows = ycRows(companies, log);
  const { matched, updated, cleared } = await setYcMatches(rows);
  return { fetched: companies.length, domains: rows.length, matched, updated, cleared };
}
