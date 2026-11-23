// ui-design.studio, a hand-picked gallery of about 350 sites (Linear, Stripe,
// A24, Teenage Engineering, Active Theory, Granola...). Its /websites page
// lists every site in one go, grouped into sections (studios, product, AI,
// brand, commerce, places, type, culture, people, experiments); each card
// links straight out to the site, so no page per site is fetched and the
// listing page is every entry's sourceRef. The section is mapped to an
// industry where it names one.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

const PAGE = "https://www.ui-design.studio/websites";
const SECTION_INDUSTRY = {
  studios: "Agency & Portfolio",
  people: "Agency & Portfolio",
  product: "SaaS",
  ai: "AI",
  commerce: "E-commerce",
  culture: "Media & Publishing",
};

export const name = "uidesignstudio";

export async function* listing({ limit }) {
  const $ = cheerio.load(await fetchHtml(PAGE));
  const entries = [];
  $("section[id]").each((_, section) => {
    const industryHint = SECTION_INDUSTRY[$(section).attr("id")] ?? null;
    $(section).find("li > a[href*='ref=ui-design.studio']").each((_, a) => {
      const url = $(a).attr("href");
      if (!/^https?:\/\//.test(url)) return;
      const title = $(a).find("span.truncate").first().text().trim();
      entries.push({ url, name: title || null, industryHint, sourceRef: PAGE });
    });
  });
  if (!entries.length) console.warn(`[${name}] no entries on ${PAGE}; the gallery markup may have changed`);
  yield* entries.slice(0, limit);
}
