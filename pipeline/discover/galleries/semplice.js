// Semplice (semplice.com), the portfolio builder for designers, picks portfolio
// sites built with it in two places:
// - the Showcase (/showcase), about 18 current picks; each card links out to the
//   site and names it in its .showcase-meta block;
// - the yearly Best Of pages its Showcase Archives (/showcase-archives) link to
//   (best-design-portfolios-2017 to best-of-2024, about 15 to 20 portfolios each,
//   3 in 2019): designers and small studios (Tavo, Studio Paack, Figure, Shy Studio,
//   Smith & Diction, Not Real), each written up with links out to the site.
// The Showcase is read first, then the yearly pages in the order the archive lists
// them (newest first), one request each; a new year joins once the archive links it.
// The yearly pages name no site in markup, so their entries carry no name. A site
// picked twice is yielded once; known domains are skipped downstream.
// robots.txt allows everything. It keeps the normal quality bar.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

const BASE = "https://www.semplice.com";
const OWN = /(^|\.)semplice(labs)?\.com$/i;
const SOCIAL = /(^|\.)(instagram|twitter|x|facebook|linkedin|behance|dribbble|vimeo|youtube)\.com$/i;

export const name = "semplice";

const hostOf = (href) => {
  try {
    return new URL(href).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
};

// The Showcase cards: { url, name }.
export function showcase($) {
  return $(".showcase-meta .name a[href^='http']").map((_, el) => {
    const link = $(el);
    return { url: link.attr("href").trim(), name: link.text().trim() || null };
  }).get();
}

// The archive to its yearly Best Of pages, in the order it lists them.
export function years($) {
  return [...new Set($("a.apg-grid-item[href]").map((_, el) => {
    try {
      const u = new URL($(el).attr("href"), BASE);
      return OWN.test(u.hostname) ? u.href : null;
    } catch {
      return null;
    }
  }).get().filter(Boolean))];
}

// A yearly page to its portfolio links: every link out that opens in a new tab
// (the cover image and the "Visit portfolio" button link to the same site).
export function picks($) {
  return $("a[target='_blank'][href^='http']").map((_, el) => $(el).attr("href").trim()).get()
    .filter((href) => {
      const host = hostOf(href);
      return host && host.includes(".") && !OWN.test(host) && !SOCIAL.test(host);
    });
}

export async function* listing({ limit }) {
  const hosts = new Set();
  let yielded = 0;
  function* take(entries, sourceRef) {
    for (const { url, name } of entries) {
      if (yielded >= limit) return;
      const host = hostOf(url);
      if (!host || hosts.has(host)) continue;
      hosts.add(host);
      yielded++;
      yield { url, name, sourceRef };
    }
  }

  const front = showcase(cheerio.load(await fetchHtml(`${BASE}/showcase`)));
  if (!front.length) console.warn(`[${name}] no entries on ${BASE}/showcase; the gallery markup may have changed`);
  yield* take(front, `${BASE}/showcase`);
  if (yielded >= limit) return;

  const pages = years(cheerio.load(await fetchHtml(`${BASE}/showcase-archives`)));
  if (!pages.length) console.warn(`[${name}] no yearly pages on ${BASE}/showcase-archives; its markup may have changed`);
  for (const page of pages) {
    if (yielded >= limit) return;
    const urls = picks(cheerio.load(await fetchHtml(page)));
    if (!urls.length) console.warn(`[${name}] no portfolio links on ${page}; its markup may have changed`);
    yield* take(urls.map((url) => ({ url, name: null })), page);
  }
}
