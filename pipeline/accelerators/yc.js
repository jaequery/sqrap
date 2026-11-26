// Y Combinator, from the public yc-oss mirror of YC's company directory (every
// batch, not only the current one). One JSON file carries every company's
// website, batch and ycombinator.com page, so no per-company page is fetched.
// Matched by pipeline/accelerators/sync.js like the other programs.

export const YC_SOURCE = "https://yc-oss.github.io/api/companies/all.json";
const SEASONS = { winter: "W", spring: "X", summer: "S", fall: "F" };
const SEASON_ORDER = { W: 1, X: 2, S: 3, F: 4 };

export const name = "yc";
export const hasCohortYears = true;

// "Winter 2026" -> "W26", "Spring 2025" -> "X25". Null for anything else
// (yc-oss lists a few companies as "Unspecified").
export function batchLabel(batch) {
  const m = /^\s*(winter|spring|summer|fall)\s+(\d{4})\s*$/i.exec(String(batch || ""));
  return m ? `${SEASONS[m[1].toLowerCase()]}${m[2].slice(2)}` : null;
}

// Sortable rank of a row: later batches rank higher; no batch ranks lowest.
// When two companies share a domain (a rename, say), the latest batch wins.
export const rank = (row) => (row.batch ? Number(`20${row.batch.slice(1)}`) * 10 + SEASON_ORDER[row.batch[0]] : -1);

// Every company, `batch` the short label (null for an unknown format) and
// `companyUrl` its ycombinator.com page. Throws when the mirror is unreachable
// or its shape is not what we expect.
export async function roster({ years, signal } = {}) {
  const res = await fetch(YC_SOURCE, { signal, headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`yc-oss answered ${res.status}`);
  const companies = await res.json();
  if (!Array.isArray(companies) || companies.length < 1000 || !companies.some((c) => c?.website && c?.batch)) {
    throw new Error("yc-oss returned an unexpected shape");
  }
  const rows = [];
  for (const c of companies) {
    const batch = batchLabel(c?.batch);
    const year = batch ? 2000 + Number(batch.slice(1)) : null;
    if (years && !years.includes(year)) continue;
    rows.push({
      name: c?.name || null,
      website: c?.website || null,
      batch,
      year,
      companyUrl: typeof c?.url === "string" && /^https:\/\/(www\.)?ycombinator\.com\//.test(c.url) ? c.url : null,
    });
  }
  return rows;
}

// The mirror already has the website.
export async function details(row) {
  return row;
}

export async function companies({ years, signal } = {}) {
  return roster({ years, signal });
}
