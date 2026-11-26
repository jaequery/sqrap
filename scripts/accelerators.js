// Dry run of the accelerator company fetchers (pipeline/accelerators): no
// database reads or writes. Prints, per program, how many companies it lists
// and how many have a website, plus 5 sample domains.
// Usage: npm run accelerators -- [--only techstars|finc|speedrun] [--window]
//   --window  only the cohorts discovery queues (2025 and 2026; every company
//             for a program without cohort years), as the discovery adapters do
import { parseArgs } from "node:util";
import { PROGRAMS } from "../pipeline/accelerators/index.js";

// Same window as pipeline/discover/galleries/accelerators.js (not imported:
// that module reads the database).
const COHORT_YEARS = [2025, 2026];

const host = (url) => new URL(url).hostname.replace(/^www\./, "");

const { values } = parseArgs({ options: { only: { type: "string" }, window: { type: "boolean", default: false } } });
const programs = values.only ? PROGRAMS.filter((p) => p.name === values.only) : PROGRAMS;
if (!programs.length) {
  console.error(`unknown --only ${values.only} (use ${PROGRAMS.map((p) => p.name).join("|")})`);
  process.exit(1);
}

let failed = false;
for (const program of programs) {
  const started = Date.now();
  try {
    const years = values.window && program.hasCohortYears ? COHORT_YEARS : undefined;
    const rows = await program.companies({ years, log: console.warn });
    const withSite = rows.filter((r) => r.website);
    const byYear = {};
    for (const r of rows) byYear[r.year ?? "unknown"] = (byYear[r.year ?? "unknown"] ?? 0) + 1;
    const scope = values.window ? (program.hasCohortYears ? "2025–2026 cohorts" : "whole portfolio, no cohort years") : "all cohorts";
    console.log(`[${program.name}] ${scope}: ${rows.length} companies, ${withSite.length} with a website (${Math.round((Date.now() - started) / 1000)}s)`);
    console.log(`  by cohort year: ${JSON.stringify(byYear)}`);
    console.log(`  sample: ${withSite.slice(0, 5).map((r) => `${host(r.website)} (${r.batch ?? "no batch"})`).join(", ")}`);
  } catch (err) {
    failed = true;
    console.error(`[${program.name}] failed: ${err.message}`);
  }
}
process.exit(failed ? 1 : 0);
