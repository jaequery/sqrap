// Web Design Inspiration (webdesigninspiration.io), a designer's hand-picked
// collection of landing pages, added since March 2025 and still growing (about
// 110, among them Oxide, PostHog, Lambda, Craft, Contra, Trustly and CIC), plus
// three short boards of feature, demo and pricing sections (about 40 more, mostly
// developer-tool and AI product sites). Each page is a static Next.js export
// whose `__NEXT_DATA__` lists every entry with the site's address and the date
// it was added, so the whole gallery is four requests. Landing pages come first,
// newest first, then the section boards; the page an entry is read from is its
// sourceRef, as there are no detail pages. Entries carry no industry. robots.txt
// answers 404, so nothing is disallowed.
import { fetchHtml } from "../http.js";

const BASE = "https://webdesigninspiration.io";
const PAGES = ["/", "/feature-section", "/demo-section", "/pricing-section"];

export const name = "webdesigninspiration";

// The entries of one board, newest first: [{ website, created }].
export function entries(html) {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return [];
  const images = JSON.parse(m[1])?.props?.pageProps?.images;
  if (!Array.isArray(images)) return [];
  return images
    .map((img) => ({ website: img?.metadata?.website?.trim(), created: Date.parse(img?.created) || 0 }))
    .filter((e) => e.website)
    .sort((a, b) => b.created - a.created);
}

export async function* listing({ limit }) {
  const seen = new Set();
  let yielded = 0;
  for (const path of PAGES) {
    const page = `${BASE}${path}`;
    let list;
    try {
      list = entries(await fetchHtml(page));
    } catch (err) {
      console.warn(`[${name}] skipping ${page}: ${err.message}`);
      continue;
    }
    if (!list.length) console.warn(`[${name}] no entries on ${page}; its data may have changed`);
    for (const { website } of list) {
      if (yielded >= limit) return;
      const url = /^https?:\/\//i.test(website) ? website : `https://${website}`;
      let host;
      try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { continue; }
      if (host === "webdesigninspiration.io" || seen.has(host)) continue;
      seen.add(host);
      yielded++;
      yield { url, sourceRef: page };
    }
  }
}
