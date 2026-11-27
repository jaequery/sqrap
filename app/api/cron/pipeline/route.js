import { snapshotAgentUsage } from "../../../../lib/agent-quota";
import { judgeHealth, lastEvent, queueCounts, recordEvent } from "../../../../lib/db";
import { embeddingsEnabled } from "../../../../lib/embeddings";
import { retryPendingPurges } from "../../../../lib/shots";
import { embedNew } from "../../../../pipeline/embed";
import { judgeEnabled, styleNew } from "../../../../pipeline/judge/index";
import { runPipeline } from "../../../../pipeline/run";
import { ACCELERATORS } from "../../../../lib/taxonomy";
import { SYNC_PROGRAMS } from "../../../../pipeline/accelerators/index";
import { syncProgram } from "../../../../pipeline/accelerators/sync";

export const dynamic = "force-dynamic";
// Pro plan ceiling. The run stops claiming at STOP_CLAIMING_MS so an in-flight
// site (home, judge, subpages, tags: several minutes on a function's CPU) can
// finish before the hard limit. A site cut off anyway is reset by a later run.
export const maxDuration = 800;
const STOP_CLAIMING_MS = 300 * 1000;
const EMBED_LIMIT = 64;
const EMBED_MS = 60 * 1000;
const STYLE_LIMIT = 8;
const STYLE_MS = 60 * 1000;
// Accelerator badges: each program at most once a day, ACCEL_PROGRAM_MS each
// and ACCEL_MS for all of them per run.
const ACCEL_MS = 75 * 1000;
const ACCEL_PROGRAM_MS = 45 * 1000;
const ACCEL_MIN_MS = 10 * 1000;
const ACCEL_EVERY_MS = 24 * 60 * 60 * 1000;
// Discover only while fewer sites than this wait for their home capture.
const DISCOVER_BELOW = 100;

// Each run: pull a few new sites from the galleries (time-boxed, so a slow
// gallery cannot eat the run), then take a few sites through capture → judge →
// style → subpages → tags, one at a time (a function has no GPU and little CPU, so a
// page takes about a minute). Fewer subpages than a local run keep an approved
// site within one run. The schedule in vercel.json sets how often it runs. Claims are atomic, so a run
// that overlaps another (or a local `npm run pipeline`) never doubles up.
const RUN = {
  discover: true, discoverLimit: 15, discoverMs: 90 * 1000,
  limit: 6, concurrency: 1, maxJudge: 18, subpages: 4, retryFailed: true,
};

// Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Not found", { status: 404 });
  }
  // CDN purges that could not run where the site left public view (local
  // admin or pipeline without VERCEL_PURGE_TOKEN): a few seconds at most.
  const purges = await retryPendingPurges({ limit: 64, ms: 15 * 1000 }).catch((err) => ({ error: err.message }));
  // Agent API usage (Redis) into agent_usage_weekly: the running and the previous week.
  const agentUsage = await snapshotAgentUsage().catch((err) => ({ error: err.message }));
  // Image embeddings for find_similar, for sites approved by earlier runs:
  // a small batch, time-boxed so the pipeline below keeps its share of the run.
  const embeddings = embeddingsEnabled()
    ? await embedNew({ limit: EMBED_LIMIT, signal: AbortSignal.timeout(EMBED_MS), log: console.error }).catch((err) => ({ error: err.message }))
    : { skipped: "no AI Gateway credentials" };
  // Styles for sites approved before styling existed, or whose style call
  // failed in their own run: a few per run, time-boxed like the embeddings.
  const styles = judgeEnabled()
    ? await styleNew({ limit: STYLE_LIMIT, signal: AbortSignal.timeout(STYLE_MS), log: console.error }).catch((err) => ({ error: err.message }))
    : { skipped: "no AI credentials" };
  const accelerators = await acceleratorsDaily();
  // A run captures far fewer sites than discovery can add, so discovery waits
  // while the capture queue is long and the run's time goes to capturing.
  const queued = Number((await queueCounts()).capture);
  const discover = queued < DISCOVER_BELOW;
  const totals = await runPipeline({ ...RUN, discover }, { signal: AbortSignal.timeout(STOP_CLAIMING_MS) });
  const judge = await judgeStatus();
  return Response.json({ data: { queued, discoverSkipped: !discover, ...totals, judge, purges, agentUsage, embeddings, styles, accelerators } }, { headers: { "Cache-Control": "no-store" } });
}

// The judge's health after the run. Without AI credentials the judge is off,
// not stalled. A stall logs one loud line, so a judge outage shows up in the
// function logs within hours (search "JUDGE STALLED").
async function judgeStatus() {
  const enabled = judgeEnabled();
  try {
    const health = await judgeHealth();
    const stalled = enabled && health.stalled;
    if (stalled) {
      console.error(`JUDGE STALLED: ${health.waiting} captured, last judged ${health.lastJudgedAt ?? "never"}, last error: ${health.lastError ?? "none"}`);
    }
    return { enabled, ...health, stalled };
  } catch (err) {
    return { enabled, error: err.message };
  }
}

// Accelerator badges and the accel= filter (pipeline/accelerators/sync.js).
// Each program syncs at most once a day: a complete sync leaves an
// `accelerator_sync:<id>` event. Programs that are due go longest-waiting
// first, each time-boxed, until the run's share is spent; the rest wait for a
// later run, and so does a program whose company pages are not all read yet
// (it resumes from its cache). A failure never clears stored badges.
async function acceleratorsDaily() {
  const started = Date.now();
  const out = {};
  const due = [];
  for (const { id } of ACCELERATORS) {
    const last = await lastEvent(`accelerator_sync:${id}`).catch(() => null);
    if (last && started - Date.parse(last.at) < ACCEL_EVERY_MS) out[id] = { skipped: `synced at ${last.at}` };
    else due.push({ id, at: last ? Date.parse(last.at) : 0 });
  }
  due.sort((a, b) => a.at - b.at);
  for (const { id } of due) {
    const program = SYNC_PROGRAMS.find((p) => p.name === id);
    const left = ACCEL_MS - (Date.now() - started);
    if (!program || left < ACCEL_MIN_MS) { out[id] = { skipped: program ? "no time left in this run" : "no fetcher" }; continue; }
    try {
      const result = await syncProgram(program, { signal: AbortSignal.timeout(Math.min(ACCEL_PROGRAM_MS, left)), log: console.error });
      if (!result.pending) await recordEvent(null, `accelerator_sync:${id}`, result);
      out[id] = result;
    } catch (err) {
      console.error(`[${id}] accelerator sync failed: ${err.message}`);
      out[id] = { error: err.message };
    }
  }
  return out;
}
