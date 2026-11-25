// Longlist (longlist.design), "design studios and designers worth knowing": a
// hand-curated directory, by Dine, of about 1,000 design studios, 280
// independent designers and 145 type foundries in some 65 countries (Mutabor,
// Lotta Nieminen, Buro Blank, Bloom Type...). It publishes the whole directory
// as one static file, /data/entries.json (documented in its /openapi.json),
// newest first, each entry with the studio's own site (website), its Longlist
// page (url, kept as the sourceRef), disciplines and an ISO country code, so
// no page per entry is fetched. Entries whose domain or Longlist page is
// already stored are skipped, so each run reaches further down the list.
// Studios, designers and foundries are Agency & Portfolio, except studios whose
// first discipline is architecture.
import { knownDomains, knownSourceRefs } from "../../../lib/db.js";
import { allowedByRobots, fetchJson } from "../http.js";
import { candidateDomain } from "../normalize.js";

const DATA = "https://longlist.design/data/entries.json";
const BATCH = 100;

export const name = "longlist";

const industryOf = (e) => (e.disciplines?.[0] === "architecture" ? "Architecture & Interior" : "Agency & Portfolio");

export async function* listing({ limit }) {
  if (!(await allowedByRobots(DATA))) {
    console.warn(`[${name}] robots.txt disallows ${DATA}`);
    return;
  }
  const data = await fetchJson(DATA);
  const entries = (Array.isArray(data) ? data : [])
    .filter((e) => /^https?:\/\//.test(e?.website ?? "") && candidateDomain(e.website));
  if (!entries.length) console.warn(`[${name}] no entries with a website in ${DATA}; its format may have changed`);
  let yielded = 0;
  for (let i = 0; i < entries.length && yielded < limit; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    const [knownDoms, knownRefs] = await Promise.all([
      knownDomains(batch.map((e) => candidateDomain(e.website))),
      knownSourceRefs(batch.map((e) => e.url).filter(Boolean)),
    ]);
    for (const e of batch) {
      if (yielded >= limit) return;
      if (knownDoms.has(candidateDomain(e.website)) || knownRefs.has(e.url)) continue;
      yielded++;
      yield {
        url: e.website,
        name: e.name?.trim() || null,
        industryHint: industryOf(e),
        countryHint: /^[A-Z]{2}$/.test(e.country ?? "") ? e.country : null,
        sourceRef: e.url || DATA,
      };
    }
  }
}
