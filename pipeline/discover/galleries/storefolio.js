// Storefolio (storefolio.co), a hand-picked gallery of online stores from
// design-led brands (Aesop, Acne Studios, Allbirds, Ace & Tate, Analogue...).
// One page lists every store three times: its home page (data-section
// "ecommerce"), a collection page and a product page. Only the home page cards
// are read; each links straight out to the store, so no detail page exists and
// the listing is every entry's sourceRef. The card's data-category is mapped to
// an industry, and stores outside fashion and food stay E-commerce.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

const BASE = "https://storefolio.co/";

const INDUSTRY = { fashion: "Fashion", jewelry: "Fashion", food: "Food & Drink" };

export const name = "storefolio";

export async function* listing({ limit }) {
  const $ = cheerio.load(await fetchHtml(BASE));
  const entries = $("article.card[data-section='ecommerce']").map((_, el) => {
    const card = $(el);
    const url = card.find("a.card-title-link[href^='http']").first().attr("href");
    if (!url) return null;
    return {
      url,
      name: card.attr("data-name")?.trim() || null,
      industryHint: INDUSTRY[card.attr("data-category")] || "E-commerce",
      sourceRef: BASE,
    };
  }).get();
  if (!entries.length) console.warn(`[${name}] no entries on ${BASE}; the gallery markup may have changed`);
  yield* entries.slice(0, limit);
}
