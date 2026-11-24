// Peek Paper (peekpaper.com), "the web's daily paper": a hand-picked edition of
// about a dozen sites a day since February 2026, mostly studios, designer
// portfolios and design-led brands (Analogue, Groth Studio, World Labs,
// Rathbone...), about 2,200 in all. Its sitemap lists every edition
// (/YYYY/MM/DD) and every post page (/YYYY/MM/DD/<slug>), which is the
// sourceRef. Post pages already stored as a site's sourceRef are skipped, and
// only editions that still hold an unseen post are read, newest first, from
// /content/editions/YYYY/MM/DD.json, whose posts carry the site's url and
// title. robots.txt allows everything but /__skin/.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml, fetchJson } from "../http.js";

const BASE = "https://peekpaper.com";
const POST = /^https:\/\/peekpaper\.com\/(\d{4}\/\d{2}\/\d{2})\/[\w-]+$/;

export const name = "peekpaper";

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const refs = [...new Set($map("url > loc").map((_, el) => $map(el).text().trim()).get().filter((loc) => POST.test(loc)))];
  if (!refs.length) {
    console.warn(`[${name}] no post pages in the sitemap; its format may have changed`);
    return;
  }
  const known = await knownSourceRefs(refs);
  const dates = [...new Set(refs.filter((ref) => !known.has(ref)).map((ref) => ref.match(POST)[1]))].sort().reverse();
  let yielded = 0;
  for (const date of dates) {
    if (yielded >= limit) return;
    let edition;
    try {
      edition = await fetchJson(`${BASE}/content/editions/${date}.json`);
    } catch (err) {
      console.warn(`[${name}] skipping the ${date} edition: ${err.message}`);
      continue;
    }
    for (const post of edition.posts || []) {
      if (yielded >= limit) return;
      const ref = `${BASE}/${date}/${post.slug}`;
      if (known.has(ref) || !/^https?:\/\//.test(post.url || "")) continue;
      if (/^https?:\/\/([^/]+\.)?peekpaper\.com\b/i.test(post.url)) continue;
      yielded++;
      yield { url: post.url, name: post.title?.trim() || null, sourceRef: ref };
    }
  }
}
