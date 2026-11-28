// Admire the Web. Each listing page (/page/<n>/, about 40 sites, newest first) links
// to /inspiration/<slug>/ detail pages, and each detail page's screenshot links out to
// its site. The archive runs back to 2011 in about 77 pages (page 50, where this adapter
// used to stop, is early 2014); the last page links no next page, and a page past the
// end answers 404. Like the shared paging loop (./paged.js), a run reads page 1 for new
// picks, then resumes at the page an earlier run reached (gallery_cursors). Detail pages
// already stored as a site's sourceRef are not fetched again. robots.txt allows both.
import * as cheerio from "cheerio";
import { galleryCursor, knownSourceRefs, setGalleryCursor } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://admiretheweb.com";
const MAX_PAGES = 150;

export const name = "admiretheweb";

function detailRefs($) {
  const refs = $("a[href^='/inspiration/']")
    .map((_, a) => new URL($(a).attr("href"), BASE).href).get()
    .filter((href) => /^https:\/\/admiretheweb\.com\/inspiration\/[^/]+\/$/.test(href) && !href.includes("/inspiration/tag/"));
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
    const pageUrl = page > 1 ? `${BASE}/page/${page}/` : `${BASE}/`;
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
      let $;
      try {
        $ = cheerio.load(await fetchHtml(ref));
      } catch (err) {
        console.warn(`[${name}] skipping ${ref}: ${err.message}`);
        continue;
      }
      const url = $(".block-inspiration__item .c-item__image a[href^='http']").attr("href");
      if (!url) continue;
      yielded++;
      yield { url, name: $("h1").first().text().trim() || null, sourceRef: ref };
    }
    // The last page links no next page; stop there rather than read the 404 past it.
    if (!$list(`a[href="/page/${page + 1}/"]`).length) return;
  }
}
