// Mosaic (mosaic.select), a daily-curated Framer gallery of studio, portfolio,
// brand, food and drink, editorial and product sites. Its listings load more
// entries client-side and ignore ?page=, so the adapter reads every
// /categories/<slug> page its sitemap lists ("all" first, newest first in
// each), which together serve a few hundred sites. Each card
// ([data-framer-name="Website"]) links straight out to the site and carries a
// name and a category label; Framer renders every card once per breakpoint, so
// URLs are deduplicated. Category pages are fetched one at a time as entries
// are consumed.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://mosaic.select";

export const name = "mosaic";

function industry(label) {
  return /^f\s*&\s*b$/i.test(label) ? "Food & Drink" : industryFromTags(label);
}

async function categoryPages() {
  const $ = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const pages = [...new Set($("url > loc").map((_, el) => $(el).text().trim()).get()
    .filter((loc) => /^https:\/\/mosaic\.select\/categories\/[^/]+$/.test(loc)))];
  const all = `${BASE}/categories/all`;
  return [all, ...pages.filter((p) => p !== all)];
}

export async function* listing({ limit }) {
  const seen = new Set();
  let yielded = 0;
  for (const pageUrl of await categoryPages()) {
    if (yielded >= limit) return;
    const $ = cheerio.load(await fetchHtml(pageUrl));
    for (const el of $("[data-framer-name='Website']").get()) {
      const card = $(el);
      const url = card.find("a[href^='http']").first().attr("href");
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const [title, label] = card.find("[data-framer-name='Project Name'] p").map((_, p) => $(p).text().trim()).get();
      if (yielded >= limit) return;
      yielded++;
      yield { url, name: title || null, industryHint: label ? industry(label) : null, sourceRef: pageUrl };
    }
  }
  if (!seen.size) console.warn(`[${name}] no site cards on its category pages; the gallery markup may have changed`);
}
