// Palate's reference gallery (palatemcp.com/gallery), about 500 hand-analysed
// real sites, each with a written note on its type, colour and layout: stores,
// restaurants and hotels, studios, clinics, developer tools and SaaS (Aesop,
// Bellroy, Mercury, Oxide, Ikoyi, Koto...). The served gallery page holds every
// card, each with its /gallery/<slug> link and a `data-vertical` (retail,
// hospitality, developer-tool...) that is mapped to an industry. Cards carry no
// outbound link, so one detail page is fetched per new site; the link under its
// heading is the site. Detail pages already stored as a site's sourceRef are not
// fetched again. robots.txt allows everything but /api/.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://palatemcp.com";
const GALLERY = `${BASE}/gallery`;
const BATCH = 50;

export const name = "palate";

// Verticals the keyword list misses or would misplace. Hospitality mixes
// hotels with restaurants and cafés, and professional services, trades and
// other name no one industry, so they get none.
const VERTICAL = {
  "beauty": "Health",
  "consumer-brand": "E-commerce",
  "creative-tool": "SaaS",
  "data-infrastructure": "Developer tools",
  "hospitality": null,
  "marketing-platform": "SaaS",
  "hr-platform": "SaaS",
  "media-streaming": "Media & Publishing",
  "robotics": "SaaS",
  "type-foundry": "Agency & Portfolio",
  "auction-house": "E-commerce",
  "online-learning": "Education",
  "professional-services": null,
  "trades": null,
  "other": null,
};

function industryFromVertical(vertical) {
  if (!vertical) return null;
  if (vertical in VERTICAL) return VERTICAL[vertical];
  return industryFromTags(vertical.replace(/-/g, " "));
}

export async function* listing({ limit }) {
  const $ = cheerio.load(await fetchHtml(GALLERY));
  const cards = new Map();
  $("a.gl-card[href^='/gallery/']").each((_, a) => {
    const href = $(a).attr("href");
    if (!/^\/gallery\/[\w-]+$/.test(href)) return;
    const ref = BASE + href;
    if (!cards.has(ref)) cards.set(ref, $(a).attr("data-vertical") || null);
  });
  if (!cards.size) {
    console.warn(`[${name}] no site cards on ${GALLERY}; the markup may have changed`);
    return;
  }
  const refs = [...cards.keys()];
  let yielded = 0;
  for (let i = 0; i < refs.length && yielded < limit; i += BATCH) {
    const batch = refs.slice(i, i + BATCH);
    const known = await knownSourceRefs(batch);
    for (const ref of batch) {
      if (yielded >= limit) return;
      if (known.has(ref)) continue;
      let html;
      try {
        html = await fetchHtml(ref);
      } catch (err) {
        console.warn(`[${name}] skipping ${ref}: ${err.message}`);
        continue;
      }
      const $d = cheerio.load(html);
      const h1 = $d("h1").first();
      const url = h1.nextAll("a[target='_blank'][href^='http']").first().attr("href");
      if (!url || /^https?:\/\/([^/]+\.)?palatemcp\.com\b/i.test(url)) continue;
      yielded++;
      yield {
        url,
        name: h1.text().trim() || null,
        industryHint: industryFromVertical(cards.get(ref)),
        sourceRef: ref,
      };
    }
  }
}
