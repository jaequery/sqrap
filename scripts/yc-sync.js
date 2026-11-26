// Matches the library's sites against Y Combinator's company directory (the
// yc-oss mirror) and stores each match's batch and YC page (pipeline/yc.js).
// Usage: npm run yc:sync
import "./env.js";
import { recordEvent } from "../lib/db.js";
import { syncYc } from "../pipeline/yc.js";

try {
  const result = await syncYc({ signal: AbortSignal.timeout(60 * 1000), log: console.error });
  await recordEvent(null, "yc_sync", result);
  console.log(JSON.stringify(result));
} catch (err) {
  console.error(`yc sync failed: ${err.message}`);
  process.exitCode = 1;
}
