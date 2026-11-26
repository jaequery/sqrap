// Awwwards Directory (/directory/), the studios, agencies and freelancers with
// an Awwwards profile, ranked by their wins: Sites of the Day first, then
// Honorable Mentions (Locomotive, Immersive Garden, Resn, Active Theory...).
// 24 a page, about 95 pages; each card names the member's country and links
// straight to its own site, and its profile page is kept as the sourceRef.
// The Sites of the Day adapters store the client sites these studios built;
// this one reaches the studios' own sites (about 1,060 members with an award).
// The ranking ends in members with no award at all (from about page 46, most
// without a website), so the listing stops at the first card without one.
// Cards without a site link are skipped; links to LinkedIn and the like are
// refused by the blocklist. robots.txt disallows only /directory/search/?.
import { paged } from "./paged.js";
import { countryCode } from "../country.js";

const BASE = "https://www.awwwards.com";

export const name = "awwwards-directory";

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 120,
    pageUrl: (n) => `${BASE}/directory/${n > 1 ? `?page=${n}` : ""}`,
    parse,
  });
}

function parse($) {
  const entries = [];
  for (const el of $(".card-directory").toArray()) {
    const card = $(el);
    const awards = card
      .find(".box-score__bottom")
      .toArray()
      .reduce((sum, b) => sum + (parseInt($(b).text().trim(), 10) || 0), 0);
    // Ranked by awards: past the first member without one, none follow.
    if (!awards) break;
    const url = card.find(".card-directory__list a[href^='http']").first().attr("href");
    const profile = card.find("a.avatar-name__link").first().attr("href");
    if (!url || !profile) continue;
    const location = card
      .find(".card-directory__list > li")
      .filter((_, li) => $(li).find(".card-directory__section").text().trim() === "Location")
      .children()
      .eq(1)
      .text()
      .trim();
    entries.push({
      url,
      name: card.find(".avatar-name__name strong").first().text().trim() || null,
      industryHint: "Agency & Portfolio",
      countryHint: countryCode(location),
      sourceRef: new URL(profile, BASE).href,
    });
  }
  return entries;
}
