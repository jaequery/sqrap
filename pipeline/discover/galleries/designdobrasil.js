// Design do Brasil (designdobrasil.co), a hand-picked gallery of about 140
// portfolios of Brazilian designers (product, brand and motion designers, art
// and creative directors, small studios: Michael Arafat, Alexandre Rizzuti,
// Diego Tórgo, Julian Vilela, Bruno Brender). Designers submit their own site
// and the curator reviews it. Its Framer home page serves every card in one
// request; each card's cover links straight to the portfolio and the card's
// first paragraph names the designer. Framer renders each card once per
// breakpoint, so each address is yielded once, in page order. There is no
// detail page, so the home page is the sourceRef. Every site is tagged Agency &
// Portfolio and Brazil. robots.txt allows everything.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

const PAGE = "https://designdobrasil.co/";

export const name = "designdobrasil";

// The home page's cards to { url, name }, in page order, one per address.
export function portfolios(html) {
  const $ = cheerio.load(html);
  const seen = new Set();
  const list = [];
  $('a[data-framer-name="Cover"][href]').each((_, el) => {
    const url = $(el).attr("href").trim();
    if (!/^https?:\/\//i.test(url) || /^https?:\/\/([^/]+\.)?designdobrasil\.co\b/i.test(url)) return;
    const key = url.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
    if (seen.has(key)) return;
    seen.add(key);
    const card = $(el).parent().closest('[data-framer-name="Default"], [class*="framer-v-"]');
    list.push({ url, name: card.find("p").first().text().trim() || null });
  });
  return list;
}

export async function* listing({ limit }) {
  const list = portfolios(await fetchHtml(PAGE));
  if (!list.length) console.warn(`[${name}] no portfolios on ${PAGE}; the page markup may have changed`);
  for (const r of list.slice(0, limit)) {
    yield { url: r.url, name: r.name, industryHint: "Agency & Portfolio", countryHint: "BR", sourceRef: PAGE };
  }
}
