// hallointer.net, "a platform for contemporary internet" curated by the Berlin
// studio Liebermann Kiepe Reddemann: about 620 websites and web projects,
// mostly designer and studio portfolios, exhibitions, festivals, theaters,
// shops and experiments (Volksbühne Berlin, Emma Portner, Roel Wouters, De
// Studio...), each tagged with its designer, type and subject. One page lists
// every site, newest first; each <section> carries the site in its screen's
// data-url and its type and subject in data-filter, which hint the industry.
// Entries whose external link is marked "archive" show an earlier version of a
// site that has changed or gone offline, and about 110 more point at a
// web.archive.org snapshot of a site that is gone; both are skipped, leaving
// about 335 live sites, all from one request. Each entry's own page,
// hallointer.net/<id>, is the sourceRef. Known domains are skipped downstream.
// There is no robots.txt (the path serves the HTML home page).
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://hallointer.net";
const OWN = /^https?:\/\/([^/]+\.)?(hallointer\.net|web\.archive\.org)\b/i;

export const name = "hallointer";

// The live sites on the home page, in its order, one per URL.
export function parse($) {
  const seen = new Set();
  const entries = [];
  $("section[data-filter]").each((_, el) => {
    const section = $(el);
    if (section.find(".devicenav a.exlink").first().hasClass("archive")) return;
    const url = section.find(".screen[data-url]").first().attr("data-url")?.trim();
    if (!url || !/^https?:\/\//i.test(url) || OWN.test(url) || seen.has(url)) return;
    seen.add(url);
    const id = section.attr("id")?.trim();
    const filters = (section.attr("data-filter") || "").split(/\s+/);
    const labels = filters
      .filter((f) => f.startsWith("type+") || f.startsWith("subject+"))
      .map((f) => f.slice(f.indexOf("+") + 1).replace(/-/g, " "));
    entries.push({
      url,
      industryHint: industryFromTags(labels),
      sourceRef: id ? `${BASE}/${encodeURIComponent(id)}` : `${BASE}/`,
    });
  });
  return entries;
}

export async function* listing({ limit }) {
  let entries;
  try {
    entries = parse(cheerio.load(await fetchHtml(`${BASE}/`)));
  } catch (err) {
    console.warn(`[${name}] skipping: ${err.message}`);
    return;
  }
  if (!entries.length) console.warn(`[${name}] no site sections on ${BASE}/; the markup may have changed`);
  yield* entries.slice(0, limit);
}
