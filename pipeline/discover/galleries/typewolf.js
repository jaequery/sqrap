// Typewolf Site of the Day. Listing pages (?page=N), 9 sites a page newest first,
// link to /site-of-the-day/<slug> detail pages, whose heading links out to the
// site. The archive runs back to June 2013 in about 396 pages (page 50 is only
// December 2021, where this adapter used to stop); the last page links no older
// page, and a page past the end answers 404. Like the shared paging loop
// (./paged.js), a run reads page 1 for new picks, then resumes at the page an
// earlier run reached (gallery_cursors), so runs do not re-read hundreds of
// listing pages. Detail pages already stored as a site's sourceRef are not
// fetched again. robots.txt allows the listing and detail pages.
import * as cheerio from "cheerio";
import { galleryCursor, knownSourceRefs, setGalleryCursor } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://www.typewolf.com";
const MAX_PAGES = 500;

export const name = "typewolf";

function detailRefs($) {
  const refs = $(".item-title a[href^='/site-of-the-day/']").map((_, a) => new URL($(a).attr("href"), BASE).href).get();
  return [...new Set(refs)];
}

export async function* listing({ limit }) {
  // Without the gallery_cursors table (003 not migrated yet) every run starts at page 2.
  const cursor = await galleryCursor(name).catch((err) => {
    console.warn(`[${name}] no paging cursor, reading from the start: ${err.message}`);
    return undefined;
  });
  let yielded = 0;
  for (let page = 1; page <= MAX_PAGES && yielded < limit; page = page === 1 ? Math.max(2, cursor ?? 2) : page + 1) {
    const pageUrl = `${BASE}/site-of-the-day${page > 1 ? `?page=${page}` : ""}`;
    const $list = cheerio.load(await fetchHtml(pageUrl));
    const refs = detailRefs($list);
    if (!refs.length) {
      if (page === 1) console.warn(`[${name}] no entries on ${pageUrl}; the gallery markup may have changed`);
      return;
    }
    if (page > 1 && cursor !== undefined && page !== cursor) await setGalleryCursor(name, page);
    const known = await knownSourceRefs(refs);
    for (const ref of refs) {
      if (yielded >= limit) return;
      if (known.has(ref)) continue;
      let link;
      try {
        link = cheerio.load(await fetchHtml(ref))(".sotd-header h1 a[href^='http']").first();
      } catch (err) {
        console.warn(`[${name}] skipping ${ref}: ${err.message}`);
        continue;
      }
      if (!link.length) continue;
      yielded++;
      yield { url: link.attr("href"), name: link.text().trim() || null, sourceRef: ref };
    }
    // The last page links no older page; stop there rather than read the 404 past it.
    if (!$list(`a[href$="/site-of-the-day?page=${page + 1}"]`).length) return;
  }
}
