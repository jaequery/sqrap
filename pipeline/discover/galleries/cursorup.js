// CursorUp (cursorup.com), a Framer gallery of portfolio, agency, startup and
// e-commerce sites. Each /sites/<category> page serves its newest 47 or so
// cards and loads the rest client-side, so the adapter reads the four category
// pages its sitemap lists, then the home page for any newer card not filed in
// one yet: a couple of hundred sites in all. Each card
// (a[data-framer-name="Sites"]) links straight out to the site and holds its
// name; Framer renders every card once per breakpoint, so URLs are
// deduplicated. The category is mapped to an industry.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://www.cursorup.com";

export const name = "cursorup";

async function pages() {
  const $ = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const categories = [...new Set($("url > loc").map((_, el) => $(el).text().trim()).get()
    .filter((loc) => /^https:\/\/www\.cursorup\.com\/sites\/[^/]+$/.test(loc)))];
  return [...categories, `${BASE}/`];
}

export async function* listing({ limit }) {
  const seen = new Set();
  let yielded = 0;
  for (const pageUrl of await pages()) {
    if (yielded >= limit) return;
    const category = pageUrl.match(/\/sites\/([^/]+)$/)?.[1];
    const $ = cheerio.load(await fetchHtml(pageUrl));
    for (const el of $("a[data-framer-name='Sites'][href^='http']").get()) {
      const card = $(el);
      const url = card.attr("href");
      if (seen.has(url)) continue;
      seen.add(url);
      if (yielded >= limit) return;
      yielded++;
      const title = card.find("p").last().text().trim();
      yield { url, name: title || null, industryHint: category ? industryFromTags(category) : null, sourceRef: pageUrl };
    }
  }
  if (!seen.size) console.warn(`[${name}] no site cards on its pages; the gallery markup may have changed`);
}
