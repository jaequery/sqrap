// Repro and check for wrapped full-page screenshots (Chromium caps one capture
// at 8192 device px and repeats the page from the top past it). Shoots each
// URL with the real pipeline code (shoot + writeScreen, no database writes),
// then checks the stitched PNG and the section crops:
//   - wrap: most rows y equal to row y + 8192 device px (and far more than at
//     control shifts)
//   - duplicates: two sections on one screen with near-identical pixels
// Exits 1 when any screen fails either check.
//
// Usage: VERCEL=1 SQRAP_DATA_DIR=/tmp/x node scripts/repro-wrap.js <url>... [--platform desktop|mobile]
// VERCEL=1 selects @sparticuz/chromium and the Vercel MAX_HEIGHT, as on the cron.
// It writes images under SQRAP_DATA_DIR/shots/repro-<domain>/ and needs no DATABASE_URL.
import sharp from "sharp";
import { closeBrowser, VIEWPORTS } from "../pipeline/browser.js";
import { shoot, writeScreen } from "../pipeline/capture.js";
import { shotsDir } from "../lib/shots.js";

const LIMIT = 8192; // device px per Chromium capture
const args = process.argv.slice(2);
const pi = args.indexOf("--platform");
const platforms = pi >= 0 ? [args.splice(pi, 2)[1]] : ["desktop", "mobile"];
const urls = args;
if (!urls.length) { console.error("usage: node scripts/repro-wrap.js <url>... [--platform desktop|mobile]"); process.exit(2); }

// Share of rows y that match row y + shift (mean abs grey difference < 1 on a
// 360 px wide copy; the height is kept so the shift stays exact in device px).
// A wrapped capture scores ~0.95 at shift 8192; ordinary pages score ~0.1-0.3.
async function rowMatch(png, shift) {
  const { data, info } = await sharp(png, { limitInputPixels: false }).resize({ width: 360, height: (await sharp(png, { limitInputPixels: false }).metadata()).height, fit: "fill" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, rows = info.height - shift;
  if (rows < 32) return null;
  let match = 0;
  for (let y = 0; y < rows; y++) {
    let sum = 0;
    for (let x = 0; x < W; x++) sum += Math.abs(data[y * W + x] - data[(y + shift) * W + x]);
    if (sum / W < 1) match++;
  }
  return match / rows;
}

async function hash(path) {
  const { data } = await sharp(path).greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += data[y * 9 + x] > data[y * 9 + x + 1] ? "1" : "0";
  return bits;
}
const hamming = (a, b) => [...a].reduce((n, c, i) => n + (c !== b[i]), 0);

let bad = 0;
for (const url of urls) {
  const domain = new URL(url).hostname.replace(/^www\./, "");
  const site = { id: `repro-${domain}`, domain };
  const slug = new URL(url).pathname.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
  for (const platform of platforms) {
    const dpr = VIEWPORTS[platform].deviceScaleFactor;
    const t = Date.now();
    const shot = await shoot(site, url, platform);
    const meta = await sharp(shot.png, { limitInputPixels: false }).metadata();
    const written = await writeScreen(site, slug, platform, shot);
    // The wrap shift against two control shifts on the same image.
    const shifts = [LIMIT, Math.round(LIMIT / 2), Math.round(LIMIT * 0.75)];
    const match = [];
    for (const s of shifts) match.push(await rowMatch(shot.png, s));
    const wrapped = match[0] !== null && match[0] > 0.8 && match[0] - Math.max(match[1] ?? 0, match[2] ?? 0) > 0.3;
    const hashes = [];
    for (const s of written.sections) hashes.push({ type: s.type, y: s.y, h: await hash(`${shotsDir}/${s.imgPath}`) });
    const dupes = [];
    for (let i = 0; i < hashes.length; i++) for (let j = 0; j < i; j++) {
      if (hamming(hashes[i].h, hashes[j].h) <= 4) { dupes.push(`${hashes[i].type ?? "?"}@${hashes[i].y} ~ ${hashes[j].type ?? "?"}@${hashes[j].y}`); break; }
    }
    const ok = !wrapped && !dupes.length;
    if (!ok) bad++;
    console.log(JSON.stringify({
      url, platform, ok, ms: Date.now() - t, cssHeight: shot.height, png: `${meta.width}x${meta.height}`,
      wrapped, rowMatchAtShift: Object.fromEntries(shifts.map((s, i) => [s, match[i] === null ? null : +match[i].toFixed(3)])),
      sections: written.sections.map((s) => `${s.type ?? "?"}@${s.y}`), duplicateSections: dupes,
      full: `${shotsDir}/${written.screen.fullPath}`,
    }));
  }
}
await closeBrowser();
process.exit(bad ? 1 : 0);
