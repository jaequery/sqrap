// Awwwards by category (/websites/<category>/): every site submitted to the
// Awwwards jury, filed under one of its 26 categories (Architecture, Fashion,
// Food & Drink, Real Estate, Design Agencies...), newest first, 31 a page, in
// the same card markup as Sites of the Day. The Nominees and Honorable Mentions
// listings stop after about 320 pages (back to early 2024 and August 2022); a
// category listing has the same cap, but most categories hold fewer entries
// than that, so they run back to 2011. For example, Architecture has 89 pages,
// Fashion 107 and E-commerce 202 (about 3,900 pages in all). The five big ones
// (Business & Corporate, Design Agencies, Graphic Design, Web & Interactive,
// Other) reach the cap at about 328 pages and serve the last page again past it,
// which paged() stops on. The smaller ones answer 404 past their last page,
// which ends that category. Winners and nominees already stored by the other Awwwards adapters
// are skipped by domain and detail page.
//
// The categories are read in turn, one new entry from each, each with its own
// paging cursor, so a run reaches back through every category instead of
// exhausting the first. The category is mapped to an industry; broad ones
// (Business & Corporate, Technology, Other...) carry no hint. robots.txt only
// disallows /websites/? (the unfiltered listing's query).
import { paged } from "./paged.js";
import { parseCards } from "./awwwards.js";

const BASE = "https://www.awwwards.com";

export const name = "awwwards-categories";

// Category slug → lib/taxonomy.js INDUSTRIES (null: no hint).
const CATEGORIES = {
  "architecture": "Architecture & Interior",
  "art-illustration": null,
  "business-corporate": null,
  "culture-education": "Education",
  "design-agencies": "Agency & Portfolio",
  "e-commerce": "E-commerce",
  "events": "Entertainment",
  "fashion": "Fashion",
  "film-tv": "Entertainment",
  "food-drink": "Food & Drink",
  "games-entertainment": "Entertainment",
  "graphic-design": null,
  "hotel-restaurant": "Travel",
  "institutions": null,
  "magazine-newspaper-blog": "Media & Publishing",
  "mobile-apps": null,
  "music-sound": "Music",
  "other": null,
  "photography": "Agency & Portfolio",
  "portfolio": "Agency & Portfolio",
  "real-estate": "Real estate",
  "social-responsibility": "Nonprofit",
  "sports": null,
  "startups": null,
  "technology": null,
  "web-interactive": null,
};

// One category's listing. A 404 past its last page ends it.
async function* category(slug, industryHint, limit) {
  try {
    for await (const entry of paged({
      name: `${name}:${slug}`,
      limit,
      maxPages: 400,
      pageUrl: (n) => `${BASE}/websites/${slug}/${n > 1 ? `?page=${n}` : ""}`,
      parse: parseCards,
    })) {
      yield { ...entry, industryHint };
    }
  } catch (err) {
    if (!/^HTTP 404 for .*[?&]page=\d+$/.test(err.message)) throw err;
  }
}

export async function* listing({ limit }) {
  const live = Object.entries(CATEGORIES).map(([slug, hint]) => ({ slug, it: category(slug, hint, limit) }));
  let yielded = 0;
  while (live.length && yielded < limit) {
    for (const entry of [...live]) {
      let step;
      try {
        step = await entry.it.next();
      } catch (err) {
        console.warn(`[${name}] ${entry.slug} failed, skipping the rest of it: ${err.message}`);
        step = { done: true };
      }
      if (step.done) {
        live.splice(live.indexOf(entry), 1);
        continue;
      }
      yield step.value;
      if (++yielded >= limit) return;
    }
  }
}
