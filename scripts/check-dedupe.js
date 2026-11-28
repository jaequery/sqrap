// Quick check for the duplicate guards in pipeline/dedupe.js, on synthetic
// images (no browser, no database): a capture that wraps at 8192 device px is
// cut there and loses the sections below; one that repeats at another period
// is found too; an ordinary page is left alone; near-identical section crops
// are dropped and distinct ones (also on the same background) kept. Exits 1 on the first failure.
//
// Usage: node scripts/check-dedupe.js
import sharp from "sharp";
import { CAPTURE_LIMIT, dedupeSections, findWrapPeriod, sectionHash, trimWrap } from "../pipeline/dedupe.js";

const W = 480;
let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
  if (!ok) failed++;
};

// A made-up page `height` rows tall: bands of different colours, each with
// "text lines" of varying length, so no two bands look alike. Seeded, so runs agree.
function pageRows(height, seed = 1) {
  let s = seed;
  const rand = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const data = Buffer.alloc(W * height * 3);
  let y = 0;
  while (y < height) {
    const band = 300 + Math.floor(rand() * 500);
    const bg = [rand(), rand(), rand()].map((v) => 150 + Math.floor(v * 100));
    for (let r = y; r < Math.min(height, y + band); r++) {
      const line = (r - y) % 40 < 14 && (r - y) > 30;
      const len = line ? 60 + Math.floor((Math.sin(r * 0.37 + seed) + 1) * 150) : 0;
      for (let x = 0; x < W; x++) {
        const ink = line && x > 40 && x < 40 + len;
        const i = (r * W + x) * 3;
        data[i] = ink ? 20 : bg[0]; data[i + 1] = ink ? 20 : bg[1]; data[i + 2] = ink ? 30 : bg[2];
      }
    }
    y += band;
  }
  return data;
}
const png = (data, height) => sharp(data, { raw: { width: W, height, channels: 3 } }).png().toBuffer();

// Rows [0, period) of a page, then the page again from its top, as Chromium does.
function wrapped(height, period) {
  const page = pageRows(period);
  const out = Buffer.alloc(W * height * 3);
  for (let y = 0; y < height; y++) page.copy(out, y * W * 3, (y % period) * W * 3, ((y % period) + 1) * W * 3);
  return out;
}

// 1. Wrap at the Chromium limit, desktop (dpr 2): 12000 device px, 6000 css.
{
  const dpr = 2, height = 12000;
  const image = await png(wrapped(height, CAPTURE_LIMIT), height);
  const sections = [
    { y: 0, height: 900 }, { y: 900, height: 1500 }, { y: 2400, height: 1600 },
    { y: 4000, height: 300 }, // straddles the wrap at 4096 css
    { y: 4300, height: 900 }, { y: 5200, height: 800 }, // the repeated hero and the next band
  ];
  const r = await trimWrap(image, { sections, height: height / dpr, dpr });
  const meta = await sharp(r.png).metadata();
  check("wrap at 8192 found", r.trimmed?.period === CAPTURE_LIMIT, JSON.stringify(r.trimmed));
  check("image cut at the wrap", meta.height === CAPTURE_LIMIT && r.height === CAPTURE_LIMIT / dpr, `${meta.height} device px, ${r.height} css`);
  check("sections below the wrap dropped", r.sections.length === 4 && r.trimmed?.droppedSections === 2, r.sections.map((s) => `${s.y}+${s.height}`).join(" "));
  check("straddling section clamped", r.sections[3]?.height === CAPTURE_LIMIT / dpr - 4000, String(r.sections[3]?.height));
}

// 2. A repeat at some other period (found by matching the top of the page).
{
  const height = 9000;
  const period = await findWrapPeriod(await png(wrapped(height, 5000), height));
  check("repeat at another period found", period === 5000, String(period));
}

// 3. An ordinary long page: no wrap.
{
  const height = 18000;
  const r = await trimWrap(await png(pageRows(height, 7), height), { sections: [{ y: 0, height: 900 }], height: height / 3, dpr: 3 });
  check("ordinary page left alone", r.trimmed === null && r.height === height / 3);
}

// 3b. A sparse page with a tinted body around a white column: its empty rows
// all match each other, which must not read as a repeat.
{
  const height = 12000;
  const d = Buffer.alloc(W * height * 3, 0xee);
  let s = 42;
  const rand = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let y = 0; y < height; y++) {
    const text = rand() < 0.02, off = Math.floor(rand() * 100);
    for (let x = 100; x < 380; x++) {
      const v = text && x > 120 && x < 360 && (x + off) % 9 < 4 ? 40 : 255;
      d.fill(v, (y * W + x) * 3, (y * W + x) * 3 + 3);
    }
  }
  const period = await findWrapPeriod(await png(d, height));
  check("sparse two-tone page left alone", period === null, String(period));
}

// 4. Duplicate section crops: the same band twice (once re-encoded lossily),
// plus two distinct bands.
{
  const page = pageRows(3000, 3);
  const band = (top, h) => sharp(page, { raw: { width: W, height: 3000, channels: 3 } }).extract({ left: 0, top, width: W, height: h }).png().toBuffer();
  const a = await band(0, 600);
  const aLossy = await sharp(a).webp({ quality: 60 }).toBuffer();
  const b = await band(1000, 600);
  const c = await band(2000, 600);
  // Same background as a, other text: dHash alone cannot tell these apart.
  const lines = (lengths) => {
    const d = Buffer.alloc(W * 600 * 3, 240);
    lengths.forEach((len, i) => { for (let r = 40 + i * 40; r < 54 + i * 40; r++) d.fill(30, r * W * 3 + 120, r * W * 3 + (40 + len) * 3); });
    return sharp(d, { raw: { width: W, height: 600, channels: 3 } }).png().toBuffer();
  };
  const textA = await lines([400, 300, 380, 120, 420, 200, 350]);
  const textB = await lines([120, 410, 90, 360, 150, 400, 80, 300, 220, 390, 100, 330, 260]);
  const items = [
    { name: "a", height: 600, hash: await sectionHash(a) },
    { name: "b", height: 600, hash: await sectionHash(b) },
    { name: "a again (lossy)", height: 600, hash: await sectionHash(aLossy) },
    { name: "c", height: 600, hash: await sectionHash(c) },
    { name: "a again", height: 600, hash: await sectionHash(a) },
    { name: "text a", height: 600, hash: await sectionHash(textA) },
    { name: "text b", height: 600, hash: await sectionHash(textB) },
    { name: "text a again", height: 600, hash: await sectionHash(textA) },
  ];
  const { keep, dropped } = dedupeSections(items);
  check("duplicate sections dropped", dropped.length === 3 && dropped.every((d) => d.of.name === "a" || (d.item.name === "text a again" && d.of.name === "text a")), dropped.map((d) => `${d.item.name} ~ ${d.of.name}`).join(", "));
  check("distinct sections kept", keep.map((k) => k.name).join(",") === "a,b,c,text a,text b", keep.map((k) => k.name).join(","));
}

process.exit(failed ? 1 : 0);
