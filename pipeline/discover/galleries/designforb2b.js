// DesignforB2B (designforb2b.com), a hand-picked gallery of B2B company sites
// (Antimetal, Cohere, Calendly, Buffer...), about 110 so far. Its home page
// lists every site; each card links straight out to the site beside its
// /site/<slug> detail page, which becomes the sourceRef, so no page per site
// is fetched. The card's /industry/<slug> tag is mapped to an industry, else
// SaaS, except for hardware and industrial design, which get no hint.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://www.designforb2b.com";
const NOT_SOFTWARE = new Set(["industrial-design", "consumer-hardware"]);

export const name = "designforb2b";

export async function* listing({ limit }) {
  const $ = cheerio.load(await fetchHtml(`${BASE}/`));
  const entries = $("article").map((_, el) => {
    const card = $(el);
    const url = card.find("a[href*='ref=designforb2b.com']").first().attr("href");
    const title = card.find("a[href^='/site/']").filter((_, a) => !$(a).find("img").length).first();
    if (!url?.startsWith("http") || !title.attr("href")) return null;
    const industry = (card.find("a[href^='/industry/']").first().attr("href") || "").slice("/industry/".length);
    return {
      url,
      name: title.text().trim() || null,
      industryHint: industryFromTags(industry.replace(/-/g, " ")) ?? (NOT_SOFTWARE.has(industry) ? null : "SaaS"),
      sourceRef: new URL(title.attr("href"), `${BASE}/`).href,
    };
  }).get();
  if (!entries.length) console.warn(`[${name}] no entries on ${BASE}/; the gallery markup may have changed`);
  yield* entries.slice(0, limit);
}
