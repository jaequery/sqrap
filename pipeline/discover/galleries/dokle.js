// Dokle (dokle.design), "a design magazine on the craft of digital products": its
// editors write up one website a piece, about 155 so far since the autumn of 2026,
// in three sections: Awards (/awards/<slug>, the sites it singles out, about 100:
// Cartier's Le Chœur des Pierres, Obys' Grids, OFFF, Spyker), Websites
// (/websites/<slug>: Made Thought, Oath Biome, Husk Kitchen) and Inspiration
// (/inspiration/<slug>: Casa Momo, Nakagawa Home). Its Industry and Tools sections
// are news, not sites, and are not read. The sitemap lists every piece with its
// lastmod, so pieces are read newest first, one request per piece not yet stored
// as a site's sourceRef. Each piece links out to its site with a standalone
// new-tab link (the credited studio and any award page are plain links); deep
// links such as a campaign page on cartier.com fold into the site's home page, and
// links to Webflow staging hosts (*.webflow.io) are skipped.
// Its tags are styles (typography, motion, branding), so no industry is hinted.
// robots.txt allows everything but the account pages. It keeps the normal quality bar.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://dokle.design";
const SECTIONS = /^\/(awards|websites|inspiration)\/[^/]+\/?$/;
const OWN = /(^|\.)dokle\.design$/i;
// Webflow staging hosts (crl-2026.webflow.io, deepbook-v2-wip.webflow.io): previews
// on a shared host, not the site itself.
const STAGING = /\.webflow\.io$/i;
const BATCH = 50;

export const name = "dokle";

// The sitemap to piece URLs, newest lastmod first (sitemap order breaks ties).
export function pieces(xml) {
  const $ = cheerio.load(xml, { xml: true });
  return $("url")
    .map((i, el) => {
      const loc = $(el).find("loc").text().trim();
      const lastmod = Date.parse($(el).find("lastmod").text().trim()) || 0;
      return { loc, lastmod, i };
    })
    .get()
    .filter(({ loc }) => {
      try {
        const u = new URL(loc);
        return OWN.test(u.hostname) && SECTIONS.test(u.pathname);
      } catch {
        return false;
      }
    })
    .sort((a, b) => b.lastmod - a.lastmod || a.i - b.i)
    .map(({ loc }) => loc);
}

// A piece to the site's URL: the first standalone link out that opens in a new tab.
// The plain links beside it credit the studio, so no name is taken from the page.
export function site($) {
  return $("a.ds-link--standalone[target='_blank'][href^='http']")
    .map((_, a) => $(a).attr("href").trim())
    .get()
    .find((href) => {
      try {
        const host = new URL(href).hostname;
        return !OWN.test(host) && !STAGING.test(host);
      } catch {
        return false;
      }
    }) ?? null;
}

export async function* listing({ limit }) {
  const refs = pieces(await fetchHtml(`${BASE}/sitemap.xml`));
  if (!refs.length) {
    console.warn(`[${name}] no /awards/, /websites/ or /inspiration/ pieces in the sitemap; its format may have changed`);
    return;
  }
  const hosts = new Set();
  let yielded = 0;
  for (let i = 0; i < refs.length && yielded < limit; i += BATCH) {
    const batch = refs.slice(i, i + BATCH);
    const known = await knownSourceRefs(batch);
    for (const ref of batch) {
      if (yielded >= limit) return;
      if (known.has(ref)) continue;
      const url = site(cheerio.load(await fetchHtml(ref)));
      if (!url) continue;
      const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
      if (hosts.has(host)) continue;
      hosts.add(host);
      yielded++;
      yield { url, name: null, industryHint: null, sourceRef: ref };
    }
  }
}
