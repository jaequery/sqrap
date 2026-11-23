// perfolios (directoryyy.com, formerly perfolios.shwn.design), a hand-picked
// directory of about 300 personal sites and portfolios of designers,
// developers, design engineers and small studios (Maxime Heckel, Edoardo
// Lunardi, Raffi Chilingaryan...). Its one page carries the whole list as a
// schema.org ItemList in its JSON-LD, so no page per site is fetched; the
// listing page is every entry's sourceRef. Every site is Agency & Portfolio.
// robots.txt allows everything but /admin and /og.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

const BASE = "https://directoryyy.com";

export const name = "perfolios";

function items($) {
  for (const el of $("script[type='application/ld+json']").toArray()) {
    let data;
    try {
      data = JSON.parse($(el).text());
    } catch {
      continue;
    }
    for (const node of [data, ...(Array.isArray(data?.["@graph"]) ? data["@graph"] : [])]) {
      const list = node?.mainEntity?.["@type"] === "ItemList" ? node.mainEntity : node?.["@type"] === "ItemList" ? node : null;
      if (Array.isArray(list?.itemListElement)) return list.itemListElement.map((li) => li?.item).filter(Boolean);
    }
  }
  return [];
}

export async function* listing({ limit }) {
  const pageUrl = `${BASE}/`;
  const sites = items(cheerio.load(await fetchHtml(pageUrl)))
    .filter((s) => typeof s.url === "string" && /^https?:\/\//.test(s.url));
  if (!sites.length) console.warn(`[${name}] no ItemList in the page's JSON-LD; its markup may have changed`);
  for (const s of sites.slice(0, limit)) {
    yield { url: s.url, name: s.name?.trim() || null, industryHint: "Agency & Portfolio", sourceRef: pageUrl };
  }
}
