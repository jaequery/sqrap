// Discovery: pulls candidate sites from galleries, web search and manual seeds,
// normalizes and dedupes them by domain, and inserts new `sites` rows with
// status 'discovered'. One failing adapter never stops the others.
import { galleryCursor, getSiteByDomain, knownDomains, recordEvent, setGalleryCursor, upsertSite } from "../../lib/db.js";
import { GALLERIES } from "./galleries/index.js";
import { candidateDomain, normalizeCandidate } from "./normalize.js";
import * as search from "./search.js";
import * as seeds from "./seeds.js";

export const SOURCES = ["galleries", "search", "seeds"];

function adaptersFor(sources, only) {
  const list = [];
  if (sources.includes("galleries")) list.push(...GALLERIES);
  if (sources.includes("search")) list.push(search);
  if (sources.includes("seeds")) list.push(seeds);
  return only ? list.filter((a) => a.name === only) : list;
}

// Known entries an adapter may pass over in one turn before the turn moves on.
// Many adapters (the single-list galleries, Landingfolio's API) yield entries
// already stored; without this each would spend its turn, and a share of the
// run's reads, on one of them every run and never reach its newer finds.
const KNOWN_PER_TURN = 25;

// Pulls from every adapter in turn, so one slow or exhausted gallery does not
// starve the rest. The caller stops it once it has what it needs. Entries whose
// domain is already stored are passed over within the turn (counted in
// `state.known`), until `state.until` passes. `state.last` is the index of the
// adapter asked last.
async function* interleave(adapters, opts, state) {
  const live = adapters.map((a, index) => ({ index, name: a.name, it: a.listing(opts)[Symbol.asyncIterator]() }));
  while (live.length) {
    for (const entry of [...live]) {
      state.last = entry.index;
      let step;
      try {
        for (let passed = 0; ; passed++) {
          step = await entry.it.next();
          if (step.done || passed >= KNOWN_PER_TURN || (state.until && Date.now() > state.until)) break;
          const domain = candidateDomain(step.value.url);
          if (!domain || !(await knownDomains([domain])).has(domain)) break;
          state.known++;
        }
      } catch (err) {
        console.warn(`[${entry.name}] failed, skipping the rest of it: ${err.message}`);
        live.splice(live.indexOf(entry), 1);
        continue;
      }
      if (step.done) {
        live.splice(live.indexOf(entry), 1);
        continue;
      }
      yield { adapter: entry.name, ...step.value };
    }
  }
}

// Where a run's round-robin starts, kept in gallery_cursors (its `page` holds an
// adapter index): the adapter after the last one the previous run asked. A cron
// run stops after a few inserts, its reads or 90 seconds, often before it has
// asked every one of some 200 adapters once; with a fixed start the ones at the
// end of GALLERIES would never be read there.
const rotationKey = (sources) => `discover:rotation:${[...sources].sort().join(",")}`;

// Stores one candidate. Returns "inserted", "known" or the refusal reason.
export async function addCandidate(candidate, source) {
  const norm = await normalizeCandidate(candidate.url, { allowHosted: source !== "search" });
  if (norm.refused) return norm.refused;
  if (await getSiteByDomain(norm.domain)) return "known";
  const site = await upsertSite({
    domain: norm.domain,
    url: norm.url,
    name: candidate.name || null,
    industry: candidate.industryHint || null,
    country: candidate.countryHint || null,
    status: "discovered",
    source,
    sourceRef: candidate.sourceRef || null,
  });
  await recordEvent(site.id, "discovered", { source, sourceRef: candidate.sourceRef || null, from: candidate.url });
  return "inserted";
}

// sources: subset of SOURCES; only: a single adapter name; limit: max new sites
// inserted. Known sites do not count toward it, so galleries are read past the
// entries earlier runs already took, up to `maxReads` candidates in all; those
// passed over within an adapter's turn count toward neither (`known`).
// `until` (ms since epoch) stops it after the candidate in hand once that time
// passes. Returns { found, inserted, skipped, known }.
export async function discover({ sources = SOURCES, only, limit = 200, maxReads = limit * 10, maxQueries, urls, file, until, log = console.log } = {}) {
  const adapters = adaptersFor(sources, only);
  if (!adapters.length) throw new Error(`no adapter matches ${only ? `--only ${only}` : sources.join(", ")}`);
  const rotate = !only && adapters.length > 1;
  const key = rotationKey(sources);
  const start = rotate
    ? await galleryCursor(key).catch((err) => {
        console.warn(`[discover] no rotation cursor, starting at the first adapter: ${err.message}`);
        return 0;
      })
    : 0;
  const offset = (start ?? 0) % adapters.length;
  const order = [...adapters.slice(offset), ...adapters.slice(0, offset)];
  const counts = { found: 0, inserted: 0, skipped: 0, known: 0 };
  const state = { last: null, known: 0, until };
  const perAdapter = {};
  try {
    for await (const candidate of interleave(order, { limit: maxReads, maxQueries, urls, file }, state)) {
      counts.found++;
      const tally = (perAdapter[candidate.adapter] ??= { found: 0, inserted: 0 });
      tally.found++;
      const result = await addCandidate(candidate, candidate.adapter).catch((err) => err.message);
      if (result === "inserted") {
        counts.inserted++;
        tally.inserted++;
      } else {
        counts.skipped++;
        if (result !== "known") log(`  skip ${candidate.url}: ${result}`);
      }
      if (counts.inserted >= limit || counts.found >= maxReads || (until && Date.now() > until)) break;
    }
  } finally {
    counts.known = state.known;
    if (rotate && state.last !== null) {
      const next = (offset + state.last + 1) % adapters.length;
      await setGalleryCursor(key, next).catch((err) => console.warn(`[discover] rotation cursor not saved: ${err.message}`));
    }
  }
  for (const [name, t] of Object.entries(perAdapter)) log(`[${name}] found ${t.found}, inserted ${t.inserted}`);
  return counts;
}
