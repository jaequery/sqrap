// Guards against repeated content in captures, used at capture time
// (pipeline/capture.js) and by backfills of stored pages:
//
// - findWrapPeriod / trimWrap: a full-page screenshot that repeats itself from
//   the top. Chromium caps one capture at 8192 device px and wraps past it;
//   shoot() tiles to avoid that, and this catches any capture that still wraps.
// - sectionHash / dedupeSections: two sections on one screen with near-identical pixels.
import sharp from "sharp";

// Device px Chromium draws in one capture before it wraps to the top.
export const CAPTURE_LIMIT = 8192;

const SAMPLE_WIDTH = 64; // rows are compared at this width; the height is kept exact
const ROW_EQUAL = 1; // mean abs grey difference (0-255) below which two rows match
const ANCHOR = 256; // rows from the top that a candidate period must repeat
const MIN_PERIOD = 1024;
const MIN_OVERLAP = 128; // shorter repeats are left alone: too little to judge
const MATCH_SHARE = 0.9;

async function greyRows(input, height) {
  const { data, info } = await sharp(input, { limitInputPixels: false })
    .resize({ width: SAMPLE_WIDTH, height, fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

// The device-px period at which `input` (any image sharp reads, at device px)
// repeats itself from the top, or null. Checks `periods` when given (capture
// time passes [CAPTURE_LIMIT]: tiles keep Chromium below it, so no other
// period can come from a wrap), else CAPTURE_LIMIT plus any offset where the
// first ANCHOR rows of the page show up again (for stored shots, whose size no
// longer says where a wrap was). Only rows that differ from the row above count
// (edges of text, images, bands): empty rows match each other on any page,
// whatever their colours. A period counts when at least MATCH_SHARE of those
// rows past it equal the row the same distance from the top, and there are at
// least `minRows` such rows (default MIN_OVERLAP / 2; the backfill of stored
// shots, which checks only the exact Chromium period, lowers it to catch a
// wrap that repeats just a header).
export async function findWrapPeriod(input, { periods, minRows = MIN_OVERLAP / 2 } = {}) {
  const { height } = await sharp(input, { limitInputPixels: false }).metadata();
  const lowest = periods ? Math.min(...periods) : MIN_PERIOD;
  if (height < lowest + MIN_OVERLAP) return null;
  const { data, width: W, height: H, channels: C } = await greyRows(input, height);
  const px = (y, x) => data[(y * W + x) * C];
  const rowEqual = (a, b) => {
    let sum = 0;
    for (let x = 0; x < W; x++) sum += Math.abs(px(a, x) - px(b, x));
    return sum / W < ROW_EQUAL;
  };
  const edge = new Uint8Array(H);
  for (let y = 1; y < H; y++) edge[y] = rowEqual(y, y - 1) ? 0 : 1;

  const repeats = (p) => {
    let informative = 0, match = 0;
    for (let y = 0; y + p < H; y++) {
      if (!edge[y] && !edge[y + p]) continue;
      informative++;
      if (rowEqual(y, y + p)) match++;
    }
    return informative >= minRows && match / informative >= MATCH_SHARE;
  };

  const candidates = new Set(periods ?? [CAPTURE_LIMIT]);
  if (!periods) {
    // Edge rows near the top to look for further down.
    const anchor = [];
    for (let y = 1; y < Math.min(ANCHOR, H) && anchor.length < 32; y++) if (edge[y]) anchor.push(y);
    if (anchor.length >= 16) {
      // Most anchor rows must recur: lossy WebP input (stored shots) blurs a few
      // at block edges. The full check below decides.
      const allowed = Math.floor(anchor.length / 4);
      for (let p = MIN_PERIOD; p + MIN_OVERLAP <= H; p++) {
        let misses = 0;
        for (const y of anchor) {
          if (y + p < H && rowEqual(y, y + p)) continue;
          if (++misses > allowed) break;
        }
        if (misses <= allowed) candidates.add(p);
      }
    }
  }
  for (const p of [...candidates].sort((a, b) => a - b)) {
    if (p + MIN_OVERLAP <= H && repeats(p)) return p;
  }
  return null;
}

// Cuts a capture that repeats itself at its period. `png` is at device px,
// `sections` and `height` in css px ([{ y, height, ... }], as findSections
// returns); `periods` as for findWrapPeriod. Returns { png, height, sections,
// trimmed }: unchanged with trimmed null when there is no wrap, else the image
// cut at the period (rounded down to whole css px), sections that start below
// it dropped and the rest clamped, and trimmed = { period, from, droppedSections }
// (period and from in device px).
export async function trimWrap(png, { sections, height, dpr, periods }) {
  const period = await findWrapPeriod(png, { periods });
  if (!period) return { png, height, sections, trimmed: null };
  const meta = await sharp(png, { limitInputPixels: false }).metadata();
  const cssHeight = Math.floor(period / dpr);
  const cut = await sharp(png, { limitInputPixels: false })
    .extract({ left: 0, top: 0, width: meta.width, height: cssHeight * dpr })
    .png({ compressionLevel: 1 })
    .toBuffer();
  const kept = sections
    .filter((s) => s.y < cssHeight)
    .map((s) => ({ ...s, height: Math.min(s.height, cssHeight - s.y) }));
  return {
    png: cut,
    height: cssHeight,
    sections: kept,
    trimmed: { period, from: meta.height, droppedSections: sections.length - kept.length },
  };
}

/* ---------- Near-identical sections ---------- */

const HASH_W = 16, HASH_H = 16;
// Two sections count as the same when at most this many of the 256 dHash bits
// differ...
export const HASH_MAX_DISTANCE = 8;
// ...their 16x16 grey thumbnails differ by at most this much per cell on
// average (0-255): dHash alone sees only horizontal edges, so flat bands with
// left-aligned text look alike to it whatever their colour or wording...
export const THUMB_MAX_DIFF = 8; // a lossy re-encode of one section measured ~7, distinct ones 13+
// ...and their heights differ by at most this share.
const HEIGHT_TOLERANCE = 0.05;

// A perceptual fingerprint of an image, as "<dHash hex>.<thumbnail hex>": a
// 256-bit difference hash (greyscale at 17x16, one bit per pair of horizontal
// neighbours) and the 16x16 greyscale thumbnail. `input` and `options` are sharp's.
export async function sectionHash(input, options) {
  const grey = (w, h) => sharp(input, { limitInputPixels: false, ...options }).greyscale().resize(w, h, { fit: "fill" }).raw().toBuffer();
  const [d, thumb] = await Promise.all([grey(HASH_W + 1, HASH_H), grey(HASH_W, HASH_H)]);
  let bits = 0n;
  for (let y = 0; y < HASH_H; y++) {
    for (let x = 0; x < HASH_W; x++) bits = (bits << 1n) | (d[y * (HASH_W + 1) + x] > d[y * (HASH_W + 1) + x + 1] ? 1n : 0n);
  }
  return `${bits.toString(16).padStart((HASH_W * HASH_H) / 4, "0")}.${thumb.toString("hex")}`;
}

// Differing dHash bits and mean thumbnail difference between two fingerprints.
export function hashDistance(a, b) {
  const [da, ta] = a.split(".");
  const [db, tb] = b.split(".");
  let x = BigInt(`0x${da}`) ^ BigInt(`0x${db}`);
  let bits = 0;
  for (; x; x &= x - 1n) bits++;
  const pa = Buffer.from(ta, "hex"), pb = Buffer.from(tb, "hex");
  let sum = 0;
  for (let i = 0; i < pa.length; i++) sum += Math.abs(pa[i] - pb[i]);
  return { bits, thumb: sum / pa.length };
}

export function sameSection(a, b) {
  if (Math.abs(a.height - b.height) > HEIGHT_TOLERANCE * Math.max(a.height, b.height)) return false;
  const { bits, thumb } = hashDistance(a.hash, b.hash);
  return bits <= HASH_MAX_DISTANCE && thumb <= THUMB_MAX_DIFF;
}

// Splits `items` ([{ hash, height, ... }], top to bottom; hash from
// sectionHash, height in any one unit) into the ones to keep and the ones the
// same as an earlier kept item. Returns { keep, dropped: [{ item, of }] }.
export function dedupeSections(items) {
  const keep = [];
  const dropped = [];
  for (const item of items) {
    const of = keep.find((k) => sameSection(k, item));
    if (of) dropped.push({ item, of });
    else keep.push(item);
  }
  return { keep, dropped };
}
