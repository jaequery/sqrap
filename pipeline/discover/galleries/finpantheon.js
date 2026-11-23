// FinPantheon (finpantheon.com), a hand-picked gallery of about 200 fintech
// sites (Atlas Card, Atlantic Money, Albert, Aave, 0x...). Its home page lists
// every site; each card links straight out to the site beside its
// /websites/<slug> detail page, which becomes the sourceRef, so no page per
// site is fetched. Cards tagged Crypto or DeFi are Crypto, the rest Finance.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

const BASE = "https://finpantheon.com";

export const name = "finpantheon";

export async function* listing({ limit }) {
  const $ = cheerio.load(await fetchHtml(`${BASE}/`));
  const entries = $(".site-item").map((_, el) => {
    const card = $(el);
    const url = card.find("a.ext[href^='http']").first().attr("href");
    const ref = card.find("a.site-card[href^='/websites/']").first().attr("href");
    if (!url || !ref) return null;
    const categories = (card.attr("data-categories") || "").toLowerCase();
    return {
      url,
      name: card.find(".name").first().text().trim() || null,
      industryHint: /\b(crypto|defi)\b/.test(categories) ? "Crypto" : "Finance",
      sourceRef: new URL(ref, `${BASE}/`).href,
    };
  }).get();
  if (!entries.length) console.warn(`[${name}] no entries on ${BASE}/; the gallery markup may have changed`);
  yield* entries.slice(0, limit);
}
