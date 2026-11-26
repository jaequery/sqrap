// Matches the library's sites against every accelerator's company directory
// (pipeline/accelerators/sync.js) and stores the matches for the badges.
// Prints { <program>: { fetched, matched, updated, cleared, pending? } | { error } }.
// A program whose company pages are not all read yet reports `pending`; run it
// again to go on where it stopped.
// Usage: npm run accelerators:sync -- [--only yc|techstars|finc|speedrun] [--minutes 10]
// (`npm run yc:sync` is the same command.)
import "./env.js";
import { parseArgs } from "node:util";
import { recordEvent } from "../lib/db.js";
import { ACCELERATORS } from "../lib/taxonomy.js";
import { syncAccelerators } from "../pipeline/accelerators/sync.js";

const { values } = parseArgs({ options: { only: { type: "string" }, minutes: { type: "string", default: "10" } } });
const ids = ACCELERATORS.map((a) => a.id);
if (values.only && !ids.includes(values.only)) {
  console.error(`unknown --only ${values.only} (use ${ids.join("|")})`);
  process.exit(2);
}
const minutes = Number(values.minutes);
if (!(minutes > 0)) {
  console.error("--minutes takes a positive number");
  process.exit(2);
}

const result = await syncAccelerators({ programs: values.only ? [values.only] : undefined, ms: minutes * 60 * 1000, log: console.error });
// Complete runs count as the day's sync for the cron (app/api/cron/pipeline).
for (const [program, r] of Object.entries(result)) {
  if (!r.error && !r.pending) await recordEvent(null, `accelerator_sync:${program}`, r);
}
console.log(JSON.stringify(result, null, 2));
process.exitCode = Object.values(result).some((r) => r.error) ? 1 : 0;
