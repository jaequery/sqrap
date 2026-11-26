// Techstars (techstars.com). The portfolio page searches a Typesense
// collection with a public search-only key that /api/search/config/companies
// serves; each document has the company's website, `first_session_year` and
// `program_names`, so no per-company page is fetched. techstars.com has no
// per-company pages either: `companyUrl` is the portfolio filtered to the
// company's program (the page honors `?program=`), plus `#<company_id>` so it
// identifies one company. robots.txt allows all.
import { fetchJson } from "../discover/http.js";
import { siteUrl } from "./util.js";

const BASE = "https://www.techstars.com";
const PER_PAGE = 250; // Typesense's maximum

export const name = "techstars";
export const hasCohortYears = true;

const FIELDS = ["company_id", "company_name", "website", "first_session_year", "program_names", "brief_description", "industry_vertical"];

export async function roster({ years } = {}) {
  const cfg = await fetchJson(`${BASE}/api/search/config/companies`);
  if (!cfg?.url || !cfg.apiKey || !cfg.collection) throw new Error(`[${name}] unexpected search config; the portfolio may have changed`);
  const filter = years?.length ? `first_session_year:[${years.filter(Number.isInteger).join(",")}]` : undefined;
  const rows = [];
  let found = 0;
  for (let page = 1; ; page++) {
    const params = new URLSearchParams({ q: "*", per_page: String(PER_PAGE), page: String(page), sort_by: "website_order:asc", include_fields: FIELDS.join(",") });
    if (filter) params.set("filter_by", filter);
    const res = await fetchJson(`${cfg.url}/collections/${encodeURIComponent(cfg.collection)}/documents/search?${params}`, { headers: { "x-typesense-api-key": cfg.apiKey } });
    const hits = Array.isArray(res?.hits) ? res.hits : [];
    found = res?.found ?? found;
    for (const { document: d } of hits) {
      if (!d?.company_id || !d.company_name) continue;
      const program = d.program_names?.[0] ?? null;
      const year = Number.isInteger(d.first_session_year) ? d.first_session_year : null;
      if (years && !years.includes(year)) continue;
      rows.push({
        name: d.company_name,
        website: siteUrl(d.website),
        batch: program,
        year,
        companyUrl: `${BASE}/portfolio${program ? `?program=${encodeURIComponent(program)}` : ""}#${d.company_id}`,
        oneLiner: d.brief_description || undefined,
        industryHint: Array.isArray(d.industry_vertical) ? d.industry_vertical : undefined,
      });
    }
    if (!hits.length || page * PER_PAGE >= found) break;
  }
  if (rows.length < found) console.warn(`[${name}] read ${rows.length} of ${found} companies`);
  return rows;
}

// The search already has the website.
export async function details(row) {
  return row;
}

export async function companies({ years } = {}) {
  return roster({ years });
}
