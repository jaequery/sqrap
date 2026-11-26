// Discovery adapters for accelerator portfolios: one per program in
// pipeline/accelerators (techstars, finc, speedrun), named after it. Each yields
// the companies of the 2025 and 2026 cohorts that have a website, with the
// company's page on the accelerator's site as sourceRef. A program that
// publishes no cohort years (Founders Inc) yields its whole portfolio, as long
// as it stays under MAX_UNDATED companies. Companies whose page is already some
// site's sourceRef are skipped before their page is fetched.
import { knownSourceRefs } from "../../../lib/db.js";
import { PROGRAMS } from "../../accelerators/index.js";
import { industryFromTags } from "../industry.js";

export const COHORT_YEARS = Object.freeze([2025, 2026]);
const MAX_UNDATED = 400;
const BATCH = 50;

function adapter(program) {
  return {
    name: program.name,
    async *listing({ limit }) {
      const rows = await program.roster(program.hasCohortYears ? { years: [...COHORT_YEARS] } : {});
      if (!program.hasCohortYears && rows.length > MAX_UNDATED) {
        console.warn(`[${program.name}] ${rows.length} companies and no cohort years; skipping it (over ${MAX_UNDATED})`);
        return;
      }
      let yielded = 0;
      for (let i = 0; i < rows.length && yielded < limit; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const known = await knownSourceRefs(batch.map((r) => r.companyUrl));
        for (const row of batch) {
          if (yielded >= limit) return;
          if (known.has(row.companyUrl)) continue;
          const full = row.website ? row : await program.details(row);
          if (!full.website) continue;
          yielded++;
          yield { url: full.website, name: full.name || null, industryHint: industryFromTags(full.industryHint ?? []), sourceRef: full.companyUrl };
        }
      }
    },
  };
}

export const [techstars, finc, speedrun] = PROGRAMS.map(adapter);
