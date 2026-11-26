// Good Design Gallery (gooddesign.gallery), a small hand-curated archive
// (about 240 entries, 2026 on, still growing in November 2026) of websites,
// interfaces, identities, typography and motion experiments its two editors
// fish out of X, Threads and Instagram. Only its Websites category is read
// (about 25 entries): the served /?discipline=Websites page carries every entry
// in its flight data (title, sourceUrl, author), so one request reads it all.
// Most of its other entries are clips and posts, not sites. An entry whose
// sourceUrl is the site itself is kept; one that points to the post it was
// found in (Instagram, X, Threads, Contra) is skipped, since its own page links
// only that post. Each host is yielded once, in the gallery's order (newest
// first), the entry's /design/<id> page kept as the sourceRef. robots.txt only
// disallows /admin and /api.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";
import { flightData, objectAt } from "./catalog.js";

const BASE = "https://gooddesign.gallery";

export const name = "gooddesigngallery";

// Where an entry was spotted rather than the site it shows.
const POST = /(^|\.)(instagram\.com|x\.com|twitter\.com|threads\.(net|com)|contra\.com|pinterest\.[a-z.]+|dribbble\.com|behance\.net|youtube\.com|vimeo\.com|linkedin\.com|gooddesign\.gallery)$/i;

// "eTypes website" gives eTypes, "Léo Parpeix portfolio" gives Léo Parpeix.
function nameOf(title) {
  const t = String(title ?? "").replace(/\s+(website|portfolio)$/i, "").trim();
  return t && !/^website for /i.test(t) ? t : null;
}

// The Websites entries in a served page to { url, name, industry, sourceRef },
// one per host.
export function websites(html) {
  const text = flightData(cheerio.load(html));
  const seen = new Set();
  const out = [];
  for (const m of text.matchAll(/\{"id":"\d+","title":/g)) {
    const e = objectAt(text, m.index);
    if (!e || !Array.isArray(e.disciplines) || !e.disciplines.includes("Websites") || typeof e.sourceUrl !== "string") continue;
    let u;
    try {
      u = new URL(e.sourceUrl.trim());
    } catch {
      continue;
    }
    if (!/^https?:$/.test(u.protocol) || POST.test(u.hostname)) continue;
    const key = u.hostname.toLowerCase().replace(/^www\./, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      url: u.href,
      name: nameOf(e.title),
      industry: /\bportfolio$/i.test(String(e.title ?? "").trim()) ? "Agency & Portfolio" : undefined,
      sourceRef: `${BASE}/design/${e.id}`,
    });
  }
  return out;
}

export async function* listing({ limit = Infinity } = {}) {
  const pageUrl = `${BASE}/?discipline=Websites`;
  const list = websites(await fetchHtml(pageUrl));
  if (!list.length) console.warn(`[${name}] no websites in ${pageUrl}; its markup may have changed`);
  for (const r of list.slice(0, limit)) yield { url: r.url, name: r.name, industryHint: r.industry, sourceRef: r.sourceRef };
}
