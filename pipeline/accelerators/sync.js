// Accelerator badges: matches every program's companies (SYNC_PROGRAMS, all
// cohorts) against the library's sites and stores the matches in
// site_accelerators. A site belongs to a program when its domain equals the
// normalized hostname of one of the program's company websites: exact match
// only, never a parent domain or a fuzzy name. Run daily from the cron
// (app/api/cron/pipeline) and by `npm run accelerators:sync`.
//
// Programs whose websites sit on per-company pages (websiteOnDetails: Founders
// Inc, a16z speedrun) read them one throttled request at a time, minutes per
// program, so what they find is cached in accelerator_companies. A run stops
// at its signal and the next one resumes; until every company of a program
// has been read once, its matches are added but none are cleared. Cached
// websites are re-read after REFRESH_MS, oldest first, when time is left.
import { acceleratorCompanies, normalizeDomain, saveAcceleratorCompanies, setAcceleratorMatches, setYcMatches, tx } from "../../lib/db.js";
import { SYNC_PROGRAMS } from "./index.js";

const REFRESH_MS = 30 * 24 * 60 * 60 * 1000;
// Cache writes go out in batches of this many company pages.
const SAVE_EVERY = 20;

// Hosts where many companies park a page (a profile, a repo): a site on one of
// them is never some company's own site.
const SHARED_HOSTS = new Set([
  "facebook.com", "linkedin.com", "twitter.com", "x.com", "instagram.com", "youtube.com", "tiktok.com",
  "github.com", "medium.com", "substack.com", "linktr.ee", "angel.co", "wellfound.com", "crunchbase.com",
  "apps.apple.com", "play.google.com", "google.com", "notion.so", "notion.site", "ycombinator.com",
]);

// "https://www.Example.com/about" -> "example.com", the way sites.domain is
// stored; null when not an http(s) URL or a shared host.
export function websiteDomain(website) {
  if (!website) return null;
  try {
    const u = new URL(/^[a-z][\w+.-]*:\/\//i.test(website) ? website : `https://${website}`);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const domain = normalizeDomain(u.hostname);
    return domain && domain.includes(".") && !SHARED_HOSTS.has(domain) ? domain : null;
  } catch {
    return null;
  }
}

const aborted = (signal) => new Promise((_, reject) => {
  if (!signal) return;
  const fail = () => reject(new Error(`timed out (${signal.reason?.message || "aborted"})`));
  if (signal.aborted) fail();
  else signal.addEventListener("abort", fail, { once: true });
});
// `promise`, or a rejection once `signal` aborts (the fetchers take no signal).
const within = (promise, signal) => (signal ? Promise.race([promise, aborted(signal)]) : promise);

// Fills `website` on the roster rows of a websiteOnDetails program from the
// cache, then reads the missing ones (and stale ones, oldest first) until
// `signal` aborts. Returns how many rows still have never been read.
async function resolveWebsites(program, rows, { signal, log }) {
  const cache = await acceleratorCompanies(program.name);
  const now = Date.now();
  const missing = [];
  const stale = [];
  for (const row of rows) {
    if (row.website || !row.companyUrl) continue;
    const hit = cache.get(row.companyUrl);
    if (!hit) { missing.push(row); continue; }
    row.website = hit.website;
    if (now - Date.parse(hit.checkedAt) > REFRESH_MS) stale.push([Date.parse(hit.checkedAt), row]);
  }
  stale.sort((a, b) => a[0] - b[0]);
  const queue = [...missing, ...stale.map(([, row]) => row)];
  const done = new Set();
  let batch = [];
  const flush = async () => {
    if (batch.length) await saveAcceleratorCompanies(program.name, batch);
    batch = [];
  };
  for (const row of queue) {
    if (signal?.aborted) break;
    let full;
    try {
      full = await within(program.details({ ...row }), signal);
    } catch (err) {
      if (signal?.aborted) break;
      // A page that fails is retried after REFRESH_MS, not on every run.
      log(`[${program.name}] ${row.companyUrl}: ${err.message}`);
      full = row;
    }
    row.website = full.website ?? null;
    done.add(row);
    batch.push({ companyUrl: row.companyUrl, website: row.website });
    if (batch.length >= SAVE_EVERY) await flush();
  }
  await flush();
  return missing.filter((r) => !done.has(r)).length;
}

// [{ domain, batch, url }], one per domain: the highest-ranked company wins.
export function matchRows(program, rows) {
  const rank = program.rank ?? ((r) => r.year ?? -1);
  const byDomain = new Map();
  for (const r of rows) {
    const domain = websiteDomain(r.website);
    if (!domain) continue;
    const prev = byDomain.get(domain);
    if (!prev || rank(r) > rank(prev.row)) byDomain.set(domain, { row: r, domain });
  }
  return [...byDomain.values()].map(({ row, domain }) => ({ domain, batch: batchOf(program, row), url: row.companyUrl ?? null }));
}

// The stored batch: YC's label ("W26"), the Techstars cohort year ("2025",
// its program name is too long for a badge), speedrun's cohort ("SR007"),
// nothing for Founders Inc (it publishes no cohorts).
function batchOf(program, row) {
  if (program.name === "techstars") return row.year ? String(row.year) : null;
  return row.batch ? String(row.batch) : row.year ? String(row.year) : null;
}

// Syncs one program. Throws, and changes nothing, when its fetch fails or
// returns no companies. Returns { fetched, matched, updated, cleared } plus
// `pending` (companies whose page has not been read yet) when not complete.
export async function syncProgram(program, { signal, log = () => {} } = {}) {
  const rows = await within(program.roster({ signal }), signal);
  if (!rows.length) throw new Error("no companies listed");
  const pending = program.websiteOnDetails ? await resolveWebsites(program, rows, { signal, log }) : 0;
  // YC's rows without a known batch format keep the legacy yc_* columns (as
  // before) but get no badge row.
  const matches = matchRows(program, rows).filter((m) => program.name !== "yc" || m.batch);
  // One transaction per program (YC's also refreshes the legacy columns).
  const result = await tx(async () => {
    const r = await setAcceleratorMatches(program.name, matches, { clear: pending === 0 });
    if (program.name === "yc") await setYcMatches(matchRows(program, rows));
    return r;
  });
  return { fetched: rows.length, ...result, ...(pending ? { pending } : {}) };
}

// Syncs `programs` (ids; default every one) in turn, each with its own time
// box of `ms`. A failing program is logged and reported, never fatal.
export async function syncAccelerators({ programs, ms = 10 * 60 * 1000, log = () => {} } = {}) {
  const out = {};
  for (const program of SYNC_PROGRAMS.filter((p) => !programs || programs.includes(p.name))) {
    try {
      out[program.name] = await syncProgram(program, { signal: AbortSignal.timeout(ms), log });
    } catch (err) {
      log(`[${program.name}] sync failed, its badges are left as they are: ${err.message}`);
      out[program.name] = { error: err.message };
    }
  }
  return out;
}
