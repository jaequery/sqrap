import { snapshotAgentUsage } from "../../../../lib/agent-quota";
import { lastEvent, queueCounts, recordEvent } from "../../../../lib/db";
import { embeddingsEnabled } from "../../../../lib/embeddings";
import { retryPendingPurges } from "../../../../lib/shots";
import { embedNew } from "../../../../pipeline/embed";
import { judgeEnabled, styleNew } from "../../../../pipeline/judge/index";
import { runPipeline } from "../../../../pipeline/run";
import { syncYc } from "../../../../pipeline/yc";

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
const YC_MS = 30 * 1000;
const YC_EVERY_MS = 24 * 60 * 60 * 1000;
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
  const yc = await ycDaily();
  // A run captures far fewer sites than discovery can add, so discovery waits
  // while the capture queue is long and the run's time goes to capturing.
  const queued = Number((await queueCounts()).capture);
  const discover = queued < DISCOVER_BELOW;
  const totals = await runPipeline({ ...RUN, discover }, { signal: AbortSignal.timeout(STOP_CLAIMING_MS) });
  return Response.json({ data: { queued, discoverSkipped: !discover, ...totals, purges, agentUsage, embeddings, styles, yc } }, { headers: { "Cache-Control": "no-store" } });
}

// YC batches for the badge and the yc=1 filter (pipeline/yc.js): at most once a
// day, time-boxed. A successful sync leaves a `yc_sync` event, so a failed one
// is retried on the next run; a failure never clears stored batches.
async function ycDaily() {
  const last = await lastEvent("yc_sync").catch(() => null);
  if (last && Date.now() - Date.parse(last.at) < YC_EVERY_MS) return { skipped: `synced at ${last.at}` };
  try {
    const result = await syncYc({ signal: AbortSignal.timeout(YC_MS), log: console.error });
    await recordEvent(null, "yc_sync", result);
    return result;
  } catch (err) {
    console.error(`yc sync failed: ${err.message}`);
    return { error: err.message };
  }
}
