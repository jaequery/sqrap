// Cleans up pages stored before capture stopped wrapping (Chromium draws at
// most 8192 device px per screenshot and repeats the page from the top past
// it; pipeline/capture.js now shoots in tiles), and near-identical sections on
// any screen.
//
// Walks every page, oldest capture first, in batches. For each of its screens:
// - wrap: only a screen taller than its stored wrap period (8192 device px at
//   the stored width: 4096 px for both platforms) can be affected, so only
//   those full images are downloaded and checked (findWrapPeriod at exactly
//   that period, rounded both ways when the image was narrowed). A wrapped page of a public site is captured again with the
//   fixed capture (recapturePage, site status untouched). When that fails, or
//   the site is not public or disallowed by robots.txt, the page is cleaned up
//   instead (opted-out domains are left alone: nothing is written for them): the full image is cut at the period (new path, since
//   shots are cached as immutable), its agent tiles rebuilt, sections at or
//   past the period deleted and the one straddling it cut short.
// - duplicates: the stored section images are hashed (sectionHash) and a
//   section near-identical to an earlier one on the same screen is deleted.
// Deleted rows take their agent images and embeddings with them (cascade);
// their shots are removed. Each fixed page gets a `dedupe_backfill` event.
//
// Dry run by default: prints what it would change and the totals. Pages
// captured after the run started are left alone (the fixed capture made
// them), so it is safe to stop and run again; a rerun finds nothing to fix,
// but reads every image again (there is no saved cursor).
// Screens without a page row are not checked.
//
// With --apply and no BLOB_READ_WRITE_TOKEN, shots are read from and written
// to SQRAP_DATA_DIR/shots; it refuses when the database's shots are not there
// (the shared database keeps them in Vercel Blob).
//
// Usage: npm run dedupe-sections [-- --apply] [--site <id>] [--batch 50]
// Ctrl-C once finishes the current page and stops; twice quits now.
import "./env.js";
import { parseArgs } from "node:util";
import sharp from "sharp";
import { all, get, isOptedOut, recordEvent, run, setAgentImages, tx } from "../lib/db.js";
import { publicSites } from "../lib/queries.js";
import { reindexSite } from "../lib/search.js";
import { putShot, readShot, removeShots } from "../lib/shots.js";
import { agentRaw, writeAgentTiles } from "../pipeline/agent-images.js";
import { closeBrowser, setOwnSignals, VIEWPORTS } from "../pipeline/browser.js";
import { recapturePage } from "../pipeline/capture.js";
import { CAPTURE_LIMIT, dedupeSections, findWrapPeriod, sectionHash } from "../pipeline/dedupe.js";

const USAGE = "usage: npm run dedupe-sections [-- --apply] [--dry-run] [--site <id>] [--batch N]";

let values;
try {
  ({ values } = parseArgs({
    options: {
      apply: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      site: { type: "string" },
      batch: { type: "string", default: "50" },
    },
  }));
} catch (err) {
  console.error(`${err.message}\n${USAGE}`);
  process.exit(2);
}
if (values.apply && values["dry-run"]) {
  console.error(`--apply and --dry-run do not go together\n${USAGE}`);
  process.exit(2);
}
const apply = values.apply;
const batch = Number(values.batch);
if (!Number.isInteger(batch) || batch < 1) {
  console.error(`--batch must be a whole number >= 1\n${USAGE}`);
  process.exit(2);
}

// A wrap that repeats only a header leaves few edge rows to compare; at the
// exact Chromium period this many (all but 10% matching) are enough.
const MIN_WRAP_ROWS = 16;
// Rows past the period below which a repeat is too short to judge (as in pipeline/dedupe.js).
const MIN_OVERLAP = 128;
// Sections shorter than this (css px) are not kept, as at capture.
const MIN_SECTION = 40;

const cssWidth = (platform) => VIEWPORTS[platform].viewport.width;
const dpr = (platform) => VIEWPORTS[platform].deviceScaleFactor;
// Stored px per css px of a screen's full image.
const scaleOf = (sc) => sc.width / cssWidth(sc.platform);
// The Chromium wrap period in the screen's stored full image, in its px (not
// whole when capture narrowed the image to fit WebP's size limit).
const exactPeriod = (sc) => (CAPTURE_LIMIT / dpr(sc.platform)) * scaleOf(sc);
const storedPeriods = (sc) => [...new Set([Math.floor(exactPeriod(sc)), Math.ceil(exactPeriod(sc))])];
const tallEnough = (sc) => !!(sc.full_path && sc.width && sc.height >= Math.floor(exactPeriod(sc)) + MIN_OVERLAP);
const id8 = (id) => id.slice(0, 8);

/* ---------- Reading the database ---------- */

const startedAt = new Date().toISOString();

// Pages captured before this run, after the keyset cursor, oldest first.
function nextPages(cursor) {
  const params = { started: startedAt, at: cursor.at, id: cursor.id, batch, site: values.site ?? null };
  return all(`
    SELECT p.id, p.site_id, p.path, p.url, p.pattern, coalesce(p.captured_at, '') AS at
    FROM pages p
    WHERE coalesce(p.captured_at, '') < @started
      AND (coalesce(p.captured_at, ''), p.id) > (@at, @id)
      AND (@site::text IS NULL OR p.site_id = @site)
    ORDER BY coalesce(p.captured_at, ''), p.id
    LIMIT @batch`, params);
}

function countPages() {
  const params = { started: startedAt, site: values.site ?? null };
  return get(`
    SELECT count(DISTINCT p.id) AS pages, count(DISTINCT p.site_id) AS sites, count(sc.id) AS screens
    FROM pages p LEFT JOIN screens sc ON sc.page_id = p.id
    WHERE coalesce(p.captured_at, '') < @started AND (@site::text IS NULL OR p.site_id = @site)`, params);
}

async function siteOf(siteId) {
  const params = { id: siteId };
  return get(`SELECT s.*, (${publicSites(params)}) AS public FROM sites s WHERE s.id = @id`, params);
}

const screensOf = (pageId) => all(`
  SELECT id, site_id, platform, width, height, full_path, captured_at FROM screens
  WHERE page_id = @pageId ORDER BY platform`, { pageId });

const sectionsOf = (screenId) => all(`
  SELECT id, type, y, height, img_path, sm_path FROM sections
  WHERE screen_id = @screenId ORDER BY y NULLS LAST, id`, { screenId });

/* ---------- Finding what to fix ---------- */

// What is wrong with one screen: { sc, full, period, cut, past, straddle,
// duplicates, missing }. period/cut in stored px (cut on a whole css px),
// cutCss in css px; past: sections at or past the cut (or left shorter than
// MIN_SECTION by it); straddle: the one the cut shortens, with its new css
// height; duplicates: [{ section, of }] among the sections the cut keeps.
async function inspectScreen(sc) {
  const out = { sc, full: null, period: null, past: [], straddle: null, duplicates: [], missing: [], checkedFull: false };
  const sections = await sectionsOf(sc.id);
  let kept = sections;

  if (tallEnough(sc)) {
    const full = await readShot(sc.full_path);
    if (!full) out.missing.push(sc.full_path);
    else {
      out.checkedFull = true;
      const period = await findWrapPeriod(full, { periods: storedPeriods(sc), minRows: MIN_WRAP_ROWS });
      if (period) {
        const cutCss = Math.floor(period / scaleOf(sc));
        Object.assign(out, { full, period, cutCss, cut: Math.round(cutCss * scaleOf(sc)) });
        kept = [];
        for (const s of sections) {
          if (s.y == null || s.y + (s.height ?? 0) <= cutCss) kept.push(s);
          else if (cutCss - s.y < MIN_SECTION) out.past.push(s);
          else {
            out.straddle = { section: s, height: cutCss - s.y };
            kept.push(s);
          }
        }
      }
    }
  }

  const items = [];
  for (const s of kept) {
    const img = s.img_path && (await readShot(s.img_path));
    if (!img) {
      if (s.img_path) out.missing.push(s.img_path);
      // Without its image, the straddling section cannot be cut: leave it.
      if (out.straddle?.section === s) out.straddle = null;
      continue;
    }
    const height = out.straddle?.section === s ? out.straddle.height : s.height;
    if (!height) continue;
    // The straddling section is compared by the part the cut keeps.
    const pixels = out.straddle?.section === s ? await cropTop(img, height / s.height) : img;
    items.push({ s, height, hash: await sectionHash(pixels) });
  }
  out.duplicates = dedupeSections(items).dropped.map(({ item, of }) => ({ section: item.s, of: of.s }));
  // A straddling section that is a duplicate goes, rather than being cut.
  if (out.duplicates.some((d) => d.section === out.straddle?.section)) out.straddle = null;
  return out;
}

// The top `share` (0-1) of an image, as a lossless buffer for further work.
async function cropTop(image, share) {
  const { width, height } = await sharp(image).metadata();
  return sharp(image).extract({ left: 0, top: 0, width, height: Math.max(1, Math.round(height * share)) }).png().toBuffer();
}

const isWrapped = (r) => r.period != null;
const needsWork = (r) => isWrapped(r) || r.duplicates.length > 0;

/* ---------- Fixing ---------- */

async function writeWebp(input, rel, quality) {
  const buf = await sharp(input).webp({ quality, effort: 5 }).toBuffer({ resolveWithObject: true });
  await putShot(rel, buf.data);
  return buf.info;
}

// Locks a screen row; false when it is gone (a capture replaced the page meanwhile).
const lockScreen = async (id) => !!(await get("SELECT 1 FROM screens WHERE id = @id FOR UPDATE", { id }));

// The shots a set of sections points at, agent tiles included.
async function sectionShots(ids) {
  if (!ids.length) return [];
  const rows = await all(`
    SELECT img_path AS path FROM sections WHERE id = ANY(@ids::text[])
    UNION ALL SELECT sm_path FROM sections WHERE id = ANY(@ids::text[])
    UNION ALL SELECT path FROM agent_images WHERE section_id = ANY(@ids::text[])`, { ids });
  return rows.map((r) => r.path).filter(Boolean);
}

// Applies the cleanup of one screen without a new capture. Returns the shots to
// remove (after the commit), or null when the screen is gone.
async function cleanScreen(r) {
  const { sc } = r;
  const written = [];
  try {
    const stale = await cleanScreenFiles(r, written);
    // Nothing references the new files when the screen was gone.
    if (stale === null) await removeShots(written);
    return stale;
  } catch (err) {
    await removeShots(written).catch(() => {});
    throw err;
  }
}

async function cleanScreenFiles(r, written) {
  const { sc } = r;
  let screenUpdate = null;
  let straddleUpdate = null;

  // New files first, under new names (public shots are cached as immutable).
  if (isWrapped(r)) {
    const base = `${sc.full_path.replace(/-full\.webp$/, "")}-${id8(sc.id)}`;
    const meta = await sharp(r.full).metadata();
    const cut = await sharp(r.full).extract({ left: 0, top: 0, width: meta.width, height: Math.min(r.cut, meta.height) }).png().toBuffer();
    const fullPath = `${base}-full.webp`;
    const info = await writeWebp(cut, fullPath, 80);
    written.push(fullPath);
    const tiles = await writeAgentTiles(await agentRaw(cut, sc.platform), base);
    written.push(...tiles.map((t) => t.path));
    screenUpdate = { fullPath, height: info.height, tiles };
  }
  if (r.straddle) {
    const { section: s, height } = r.straddle;
    const share = height / s.height;
    const imgPath = s.img_path.replace(/\.webp$/, `-${id8(sc.id)}.webp`);
    const img = await cropTop(await readShot(s.img_path), share);
    await writeWebp(img, imgPath, 74);
    written.push(imgPath);
    let smPath = s.sm_path;
    const sm = s.sm_path && (await readShot(s.sm_path));
    if (sm) {
      smPath = s.sm_path.replace(/-sm\.webp$/, `-${id8(sc.id)}-sm.webp`);
      await writeWebp(await cropTop(sm, share), smPath, 78);
      written.push(smPath);
    }
    const tiles = await writeAgentTiles(await agentRaw(img, sc.platform), imgPath.replace(/\.webp$/, ""));
    written.push(...tiles.map((t) => t.path));
    straddleUpdate = { id: s.id, height, imgPath, smPath, tiles };
  }

  const drop = [...r.past, ...r.duplicates.map((d) => d.section)].map((s) => s.id);
  return tx(async () => {
    if (!(await lockScreen(sc.id))) return null;
    const stale = await sectionShots(drop);
    if (drop.length) await run("DELETE FROM sections WHERE id = ANY(@ids::text[])", { ids: drop });
    if (screenUpdate) {
      stale.push(sc.full_path);
      await run("UPDATE screens SET full_path = @fullPath, height = @height WHERE id = @id", { id: sc.id, ...screenUpdate });
      stale.push(...await setAgentImages({ siteId: sc.site_id, screenId: sc.id, status: "full", tiles: screenUpdate.tiles }));
    }
    if (straddleUpdate) {
      const { id, height, imgPath, smPath, tiles } = straddleUpdate;
      const old = await get("SELECT img_path, sm_path FROM sections WHERE id = @id", { id });
      await run("UPDATE sections SET height = @height, img_path = @imgPath, sm_path = @smPath WHERE id = @id", { id, height, imgPath, smPath });
      stale.push(old.img_path, ...(old.sm_path !== smPath ? [old.sm_path] : []));
      stale.push(...await setAgentImages({ siteId: sc.site_id, sectionId: id, status: "full", tiles }));
      // Its picture changed: find_similar makes a new embedding.
      await run("DELETE FROM embeddings WHERE id = @id", { id });
    }
    const fresh = new Set(written);
    return stale.filter((p) => p && !fresh.has(p));
  });
}

// The paths no row points at any more: a capture of the same page running
// meanwhile writes the same fixed names (<page>-<platform>-full.webp, …) and
// must keep them.
async function unreferenced(paths) {
  if (!paths.length) return [];
  const rows = await all(`
    SELECT p FROM unnest(@paths::text[]) AS p
    WHERE NOT EXISTS (SELECT 1 FROM screens WHERE p IN (full_path, lg_path, sm_path))
      AND NOT EXISTS (SELECT 1 FROM sections WHERE p IN (img_path, sm_path))
      AND NOT EXISTS (SELECT 1 FROM agent_images a WHERE a.path = p)`, { paths });
  return rows.map((r) => r.p);
}

/* ---------- One page ---------- */

const totals = {
  pages: 0, screens: 0, checkedFull: 0, wrappedScreens: 0, fixedPages: 0, recaptured: 0, cleaned: 0,
  sectionsPast: 0, sectionsCut: 0, duplicates: 0, missing: 0, failed: 0,
};
const affectedSites = new Set();

const describe = (r) => {
  const parts = [];
  if (isWrapped(r)) {
    parts.push(`wraps at ${r.period} px (${r.cutCss} css px)`);
    if (r.past.length) parts.push(`${r.past.length} section${r.past.length > 1 ? "s" : ""} at or past it`);
    if (r.straddle) parts.push(`1 cut to ${r.straddle.height} css px`);
  }
  if (r.duplicates.length) parts.push(`${r.duplicates.length} duplicate section${r.duplicates.length > 1 ? "s" : ""} (${r.duplicates.map((d) => `${d.section.type ?? "?"}@${d.section.y} = @${d.of.y}`).join(", ")})`);
  return parts.join(", ");
};

const summary = (r) => ({
  platform: r.sc.platform, period: r.period, cutCss: r.cutCss ?? null,
  past: r.past.map((s) => s.id), cut: r.straddle ? { id: r.straddle.section.id, height: r.straddle.height } : null,
  duplicates: r.duplicates.map((d) => ({ id: d.section.id, of: d.of.id })),
});

async function processPage(page) {
  const site = await siteOf(page.site_id);
  const screens = await screensOf(page.id);
  totals.pages++;
  if (!site || !screens.length) return;
  totals.screens += screens.length;
  // Never write anything for an opted-out domain.
  if (await isOptedOut(site.domain)) return;

  const results = [];
  for (const sc of screens) {
    const r = await inspectScreen(sc);
    if (r.checkedFull) totals.checkedFull++;
    totals.missing += r.missing.length;
    for (const m of r.missing) console.warn(`  missing ${m}`);
    results.push(r);
  }
  const wrapped = results.filter(isWrapped);
  const broken = results.filter(needsWork);
  if (!broken.length) return;

  totals.wrappedScreens += wrapped.length;
  affectedSites.add(site.id);
  const label = `${site.domain}${page.path} (site ${site.id})`;
  const recapture = wrapped.length > 0 && site.public;
  console.log(`${label}: ${wrapped.length ? (recapture ? "recapture" : "clean up (site not public)") : "drop duplicates"}`);
  for (const r of broken) console.log(`  ${r.sc.platform}: ${describe(r)}`);

  const count = (rs) => {
    for (const r of rs) {
      totals.sectionsPast += r.past.length;
      totals.sectionsCut += r.straddle ? 1 : 0;
      totals.duplicates += r.duplicates.length;
    }
  };

  if (!apply) {
    totals.fixedPages++;
    if (recapture) totals.recaptured++;
    else totals.cleaned++;
    count(broken);
    return;
  }

  if (recapture) {
    let result = null;
    try {
      result = await recapturePage(site, page);
    } catch (err) {
      console.warn(`  recapture failed (${err.code || err.message}), cleaning up instead`);
    }
    if (result) {
      const before = broken.map(summary);
      await recordEvent(site.id, "dedupe_backfill", { path: page.path, action: "recaptured", screens: before, sections: result.sections });
      totals.fixedPages++;
      totals.recaptured++;
      console.log(`  recaptured: ${result.sections} sections`);
      return;
    }
  }

  const fixed = [];
  for (const r of broken) {
    const stale = await cleanScreen(r);
    if (stale === null) {
      totals.wrappedScreens -= isWrapped(r) ? 1 : 0;
      console.log(`  ${r.sc.platform}: screen replaced meanwhile, skipped`);
      continue;
    }
    fixed.push(r);
    try {
      await removeShots(await unreferenced(stale));
    } catch (err) {
      console.warn(`  ${r.sc.platform}: could not remove old images: ${err.message}`);
    }
  }
  if (!fixed.length) return;
  count(fixed);
  await recordEvent(site.id, "dedupe_backfill", { path: page.path, action: "cleaned", screens: fixed.map(summary) });
  await reindexSite(site.id);
  totals.fixedPages++;
  totals.cleaned++;
  console.log("  cleaned up");
}

/* ---------- Run ---------- */

// Without a Blob token, shots come from SQRAP_DATA_DIR/shots. True when every
// one of a random sample of full images is there (or there are none): a few
// local leftovers next to the shared database do not pass.
async function shotsAreLocal() {
  const rows = await all("SELECT full_path FROM screens WHERE full_path IS NOT NULL ORDER BY random() LIMIT 20");
  for (const { full_path } of rows) if (!(await readShot(full_path))) return false;
  return true;
}

if (!process.env.BLOB_READ_WRITE_TOKEN && !(await shotsAreLocal())) {
  if (apply) {
    console.error("dedupe-sections: this database's shots are not under SQRAP_DATA_DIR/shots (the shared database keeps them in Vercel Blob). Set BLOB_READ_WRITE_TOKEN (vercel env pull) before --apply.");
    process.exit(2);
  }
  console.warn("warning: shots are not under SQRAP_DATA_DIR/shots and BLOB_READ_WRITE_TOKEN is not set: images will count as missing.");
}

const scope = await countPages();
console.log(`${apply ? "applying" : "dry run (pass --apply to change anything)"}: ${scope.pages} pages, ${scope.screens} screens of ${scope.sites} sites captured before ${startedAt}`);

setOwnSignals(true);
let stopping = false;
const onSignal = async (name) => {
  if (!stopping) {
    stopping = true;
    console.log(`\n${name}: finishing this page, then stopping (again to quit now)`);
    return;
  }
  console.log(`\n${name}: quitting now`);
  await closeBrowser();
  process.exit(130);
};
process.on("SIGINT", () => onSignal("SIGINT"));
process.on("SIGTERM", () => onSignal("SIGTERM"));

let code = 0;
try {
  let cursor = { at: "", id: "" };
  while (!stopping) {
    const pages = await nextPages(cursor);
    if (!pages.length) break;
    for (const page of pages) {
      if (stopping) break;
      try {
        await processPage(page);
      } catch (err) {
        totals.failed++;
        console.error(`  ${page.site_id} ${page.path} failed: ${err.stack || err.message}`);
      }
      cursor = { at: page.at, id: page.id };
    }
    console.log(`… ${totals.pages}/${scope.pages} pages checked`);
  }
} catch (err) {
  console.error(`dedupe-sections failed: ${err.stack || err.message}`);
  code = 1;
} finally {
  await closeBrowser();
}

const verb = apply ? "" : "would be ";
console.log([
  `${stopping ? "stopped early. " : ""}checked ${totals.pages} pages, ${totals.screens} screens (${totals.checkedFull} full images tall enough to wrap)`,
  `affected: ${totals.wrappedScreens} wrapped screens, ${totals.fixedPages} pages of ${affectedSites.size} sites`,
  `${verb}recaptured: ${totals.recaptured} pages; ${verb}cleaned up: ${totals.cleaned} pages`,
  `sections ${verb}removed past a wrap: ${totals.sectionsPast}, ${verb}cut at a wrap: ${totals.sectionsCut}, ${verb}removed as duplicates: ${totals.duplicates}${apply ? "" : " (for recaptured pages, if the recapture failed)"}`,
  `missing images: ${totals.missing}, failed pages: ${totals.failed}`,
].join("\n"));
if (totals.failed) code = 1;
process.exit(code);
