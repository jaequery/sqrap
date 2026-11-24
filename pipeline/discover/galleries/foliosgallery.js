// Folios.Gallery (folios.gallery), a hand-picked gallery of about 45 studio and
// personal portfolio sites (Studio Freight, Unseen, Buttermax, Wodniack,
// Diana Lu...). Its sitemap lists every /sites/<slug> page; the listings link
// only to those pages, so one is fetched per new site for its outbound link,
// the one whose text is the site's own host. Pages already stored as a site's
// sourceRef are not fetched again. Every site is Agency & Portfolio. robots.txt
// allows everything.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://folios.gallery";
const BATCH = 50;
const SITE_PAGE = /^https:\/\/folios\.gallery\/sites\/[^/?#]+$/;

export const name = "foliosgallery";

const bareHost = (s) => s.toLowerCase().replace(/^www\./, "").replace(/\/+$/, "");

// The link out to the site: an absolute link whose text is its own host.
function siteLink($) {
  for (const a of $("a[href^='http']").toArray()) {
    const href = $(a).attr("href");
    let host;
    try {
      host = new URL(href).hostname;
    } catch {
      continue;
    }
    if (/(^|\.)folios\.gallery$/i.test(host)) continue;
    if (bareHost($(a).text().trim()) === bareHost(host)) return href;
  }
  return null;
}

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const refs = [...new Set($map("url > loc").map((_, el) => $map(el).text().trim()).get().filter((u) => SITE_PAGE.test(u)))];
  if (!refs.length) console.warn(`[${name}] no /sites/ pages in the sitemap; its format may have changed`);
  let yielded = 0;
  for (let i = 0; i < refs.length && yielded < limit; i += BATCH) {
    const batch = refs.slice(i, i + BATCH);
    const known = await knownSourceRefs(batch);
    for (const ref of batch) {
      if (yielded >= limit) return;
      if (known.has(ref)) continue;
      let html;
      try {
        html = await fetchHtml(ref);
      } catch (err) {
        console.warn(`[${name}] skipping ${ref}: ${err.message}`);
        continue;
      }
      const $ = cheerio.load(html);
      const url = siteLink($);
      if (!url) continue;
      yielded++;
      yield {
        url,
        name: $("h1").first().text().replace(/\s+/g, " ").trim() || null,
        industryHint: "Agency & Portfolio",
        sourceRef: ref,
      };
    }
  }
}
