// The Headless Club (theheadlessclub.com), a directory of about 125 headless
// e-commerce stores picked by the Commerce-UI studio for both design and
// performance (Sonos, Burberry, Puma, Mammut, Our Legacy, Impossible Foods...).
// It is a Next.js site: the served home page carries the newest 36 stores in
// __NEXT_DATA__, each with its outbound `url`, so those cost one request. The
// rest come from the sitemap's /site/<slug> pages, newest lastmod first, one page
// fetched per store not yet stored as a sourceRef (each page's __NEXT_DATA__ has
// the same fields). Each store's /site/<slug> page is its sourceRef. Category
// tags are mapped to an industry, E-commerce when none fits. robots.txt allows
// /site/* (only /studio, /api and /preview are disallowed).
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://theheadlessclub.com";
const BATCH = 50;

export const name = "headlessclub";

// The directory's categories; Home, Sport, Technology and Other stay E-commerce.
const INDUSTRY = {
  fashion: "Fashion",
  "jewelry & accessories": "Fashion",
  "food & beverage": "Food & Drink",
  "health & beauty": "Health",
};

function nextData(html) {
  const raw = cheerio.load(html)("script#__NEXT_DATA__").text();
  try {
    return JSON.parse(raw).props?.pageProps ?? null;
  } catch {
    return null;
  }
}

function entry(site, sourceRef) {
  let url;
  try {
    url = new URL(String(site?.url ?? "").trim());
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol)) return null;
  const tag = site.tags?.map((t) => INDUSTRY[t?.name?.toLowerCase()]).find(Boolean);
  return { url: url.href, name: site.name?.trim() || null, industryHint: tag ?? "E-commerce", sourceRef };
}

// The newest stores, as listed on the served home page.
export function parseHome(html) {
  const list = nextData(html)?.pageBuilder?.find((b) => b?._type === "sectionSiteList");
  return (list?.items ?? [])
    .filter((it) => typeof it?.path === "string" && it.path.startsWith("/site/"))
    .map((it) => entry(it, BASE + it.path))
    .filter(Boolean);
}

// One store from its /site/<slug> page.
export function parseSite(html, sourceRef) {
  const details = nextData(html)?.pageBuilder?.find((b) => b?._type === "sectionSiteDetails");
  return details ? entry(details, sourceRef) : null;
}

export async function* listing({ limit }) {
  const seen = new Set();
  let yielded = 0;
  const home = parseHome(await fetchHtml(`${BASE}/`));
  if (!home.length) console.warn(`[${name}] no stores in the home page's __NEXT_DATA__; its format may have changed`);
  for (const e of home) {
    if (yielded >= limit) return;
    seen.add(e.sourceRef);
    yielded++;
    yield e;
  }

  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const refs = $map("url")
    .map((_, el) => ({ ref: $map(el).find("loc").text().trim(), mod: $map(el).find("lastmod").text().trim() }))
    .get()
    .filter(({ ref }) => /^https:\/\/theheadlessclub\.com\/site\/[^/]+$/.test(ref) && !seen.has(ref))
    .sort((a, b) => (a.mod < b.mod ? 1 : a.mod > b.mod ? -1 : 0))
    .map((e) => e.ref);
  for (let i = 0; i < refs.length && yielded < limit; i += BATCH) {
    const batch = refs.slice(i, i + BATCH);
    const known = await knownSourceRefs(batch);
    for (const ref of batch) {
      if (yielded >= limit) return;
      if (known.has(ref)) continue;
      const e = parseSite(await fetchHtml(ref), ref);
      if (!e) continue;
      yielded++;
      yield e;
    }
  }
}
