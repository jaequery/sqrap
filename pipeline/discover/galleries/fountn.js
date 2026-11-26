// Fountn (fountn.design), a design-resources library reviewed by senior
// designers, whose Websites section is a small hand-picked gallery of landing,
// SaaS, AI and studio sites (Supabase, Osmo, Chargetrip, Bejamas, Drewl; about
// 30, 2024 on). The site is WordPress and serves the gallery through its
// public REST API (/wp-json/wp/v2/website): one record per site with its
// outbound link in meta.ext_link and a site_type term (AI, Crypto, Ecommerce,
// Event, Landing, Portfolio, SaaS). The listing reads it newest first, 100 a
// page, plus the site_type terms once to map them to industry; each record's
// /website/<slug>/ page is its sourceRef. robots.txt only disallows /wp-admin/.
import { fetchJson } from "../http.js";

const BASE = "https://fountn.design";
const API = `${BASE}/wp-json/wp/v2`;
const PER_PAGE = 100;

export const name = "fountn";

// Fountn site types to Sqrap industries; Landing and Event carry no industry.
const INDUSTRY = { ai: "AI", crypto: "Crypto", ecommerce: "E-commerce", portfolio: "Agency & Portfolio", saas: "SaaS" };
// When a record has several types, the most specific wins.
const ORDER = ["ai", "crypto", "ecommerce", "portfolio", "saas"];

const decode = (s) =>
  String(s ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&(?:apos|#039);/g, "'")
    .trim();

// The outbound link without Fountn's ?ref= tag; "" when it is not a site.
function siteUrl(raw) {
  try {
    const u = new URL(String(raw ?? "").trim());
    if (!/^https?:$/.test(u.protocol) || /(^|\.)fountn\.design$/i.test(u.hostname)) return "";
    u.searchParams.delete("ref");
    return u.href;
  } catch {
    return "";
  }
}

// REST records to { url, name, industry, sourceRef }, newest first, one per address.
// `types` maps site_type term ids to their slugs.
export function websites(records, types = new Map()) {
  if (!Array.isArray(records)) return [];
  const list = records
    .filter((r) => (r?.status ?? "publish") === "publish")
    .map((r) => {
      const slugs = (Array.isArray(r.site_type) ? r.site_type : []).map((id) => types.get(id)).filter(Boolean);
      const type = ORDER.find((s) => slugs.includes(s));
      return {
        url: siteUrl(r.meta?.ext_link),
        name: decode(r.title?.rendered) || null,
        industry: type ? INDUSTRY[type] : undefined,
        sourceRef: typeof r.link === "string" && r.link.startsWith(BASE) ? r.link : `${BASE}/website/${r.slug}/`,
        date: String(r.date_gmt ?? r.date ?? ""),
      };
    })
    .filter((r) => r.url);
  list.sort((a, b) => b.date.localeCompare(a.date));
  const seen = new Set();
  return list.filter((r) => {
    const key = r.url.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function siteTypes() {
  try {
    const terms = await fetchJson(`${API}/site_type?per_page=100&_fields=id,slug`);
    return new Map((Array.isArray(terms) ? terms : []).map((t) => [t.id, t.slug]));
  } catch (err) {
    console.warn(`[${name}] site types: ${err.message}`);
    return new Map();
  }
}

export async function* listing({ limit = Infinity } = {}) {
  const types = await siteTypes();
  const records = [];
  for (let page = 1; records.length < limit; page++) {
    const batch = await fetchJson(
      `${API}/website?per_page=${PER_PAGE}&page=${page}&orderby=date&order=desc&_fields=id,date_gmt,slug,link,status,title,site_type,meta`,
    ).catch((err) => {
      // WordPress answers 400 for a page past the last.
      if (page > 1 && /HTTP 400/.test(err.message)) return [];
      throw err;
    });
    if (!Array.isArray(batch) || !batch.length) break;
    records.push(...batch);
    if (batch.length < PER_PAGE) break;
  }
  const list = websites(records, types);
  if (!list.length) console.warn(`[${name}] no websites from ${API}/website; its API may have changed`);
  for (const r of list.slice(0, limit)) {
    yield { url: r.url, name: r.name, industryHint: r.industry, sourceRef: r.sourceRef };
  }
}
