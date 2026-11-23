// Hero Gallery (hero.gallery), a hand-picked catalog of hero sections from
// product and startup sites (Algolia, Zapier, Contentful, Riverside...). Its
// sitemap lists every /hero-gallery/<slug> page; each links out to the site
// with ?ref=hero.gallery (which normalizing drops). Pages already stored as a
// site's sourceRef are not fetched again. The page's subject tags are mapped
// to an industry; its layout, tone, element and builder tags are ignored.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://hero.gallery";
const BATCH = 50;
// Design tags (built-with-framer, single-cta, light-mode, split-grid...), not subjects.
const DESIGN_TAG = /^(built-with-|home-heroes$)|-(element|tone|mode|cta|aligned|grid|layout)$/;

export const name = "herogallery";

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const refs = $map("url > loc").map((_, el) => $map(el).text().trim()).get()
    .filter((u) => u.startsWith(`${BASE}/hero-gallery/`));
  if (!refs.length) console.warn(`[${name}] no /hero-gallery/ pages in the sitemap; its format may have changed`);
  let yielded = 0;
  for (let i = 0; i < refs.length && yielded < limit; i += BATCH) {
    const batch = refs.slice(i, i + BATCH);
    const known = await knownSourceRefs(batch);
    for (const ref of batch) {
      if (yielded >= limit) return;
      if (known.has(ref)) continue;
      const $ = cheerio.load(await fetchHtml(ref));
      const url = $("a[href^='http'][href*='ref=hero.gallery']").first().attr("href");
      if (!url) continue;
      // The page's own tags come first, repeated once per breakpoint, and then
      // the tags of related heroes, so read up to the first repeat.
      const tags = [];
      for (const el of $("a[href*='tags/']").toArray()) {
        const tag = ($(el).attr("href") || "").split("/").pop();
        if (tags.includes(tag)) break;
        tags.push(tag);
      }
      const subjects = tags.filter((t) => t && !DESIGN_TAG.test(t)).map((t) => t.replace(/-/g, " "));
      yielded++;
      yield { url, name: $("h1").first().text().trim() || null, industryHint: industryFromTags(subjects), sourceRef: ref };
    }
  }
}
