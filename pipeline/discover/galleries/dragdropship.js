// Dragdropship (dragdropship.com), a showcase of about 670 sites taken apart
// by the tool they were built with (Webflow, Framer, Next.js, WordPress...),
// tagged by industry, style and palette. Its /showcase page serves every entry
// newest first as JSON in the data-props of its client-side Gallery island (title, page
// path and industry indexes into a shared list), but no outbound link, so one
// /showcase/<slug> page is fetched per new site for its "Visit" link
// (`a.site__visit`, a ?ref=dragdropship link; normalizing drops the query).
// Pages already stored as a site's sourceRef are not fetched again. The first
// industry with a Sqrap equivalent becomes the hint. robots.txt allows
// everything but /admin and /api.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";

const BASE = "https://dragdropship.com";
const BATCH = 50;

export const name = "dragdropship";

// Industries without an entry (Professional Services, Services, Legal, Events,
// Marketing, Beauty, Apps, Tech, Startup) carry no hint.
const INDUSTRY = {
  "Web Development": "Agency & Portfolio",
  Crypto: "Crypto",
  Fintech: "Finance",
  Analytics: "SaaS",
  Accounting: "Finance",
  Design: "Agency & Portfolio",
  "Software Development": "Developer tools",
  "Non-profit": "Nonprofit",
  Restaurant: "Food & Drink",
  "Real Estate": "Real estate",
  Health: "Health",
  Education: "Education",
  Finance: "Finance",
  Portfolio: "Agency & Portfolio",
  "E-commerce": "E-commerce",
  Agency: "Agency & Portfolio",
  SaaS: "SaaS",
};

// The Gallery island's props: { items: [{ t, h, ind }], industries: [...] }.
function showcaseData(html) {
  const $ = cheerio.load(html);
  for (const el of $("[data-island][data-props]").get()) {
    try {
      const props = JSON.parse($(el).attr("data-props"));
      if (Array.isArray(props?.items) && Array.isArray(props.industries)) return props;
    } catch {
      // not the grid
    }
  }
  return null;
}

export async function* listing({ limit }) {
  const data = showcaseData(await fetchHtml(`${BASE}/showcase`));
  if (!data) {
    console.warn(`[${name}] no showcase data on /showcase; its format may have changed`);
    return;
  }
  const entries = data.items
    .filter((item) => typeof item?.h === "string" && /^\/showcase\/[^/?#]+$/.test(item.h))
    .map((item) => ({
      ref: BASE + item.h,
      name: item.t?.trim() || null,
      industryHint: (item.ind ?? []).map((i) => INDUSTRY[data.industries[i]]).find(Boolean) ?? null,
    }));
  let yielded = 0;
  for (let i = 0; i < entries.length && yielded < limit; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    const known = await knownSourceRefs(batch.map((e) => e.ref));
    for (const entry of batch) {
      if (yielded >= limit) return;
      if (known.has(entry.ref)) continue;
      let html;
      try {
        html = await fetchHtml(entry.ref);
      } catch (err) {
        console.warn(`[${name}] skipping ${entry.ref}: ${err.message}`);
        continue;
      }
      const url = cheerio.load(html)("a.site__visit[href^='http']").first().attr("href");
      if (!url) continue;
      yielded++;
      yield { url, name: entry.name, industryHint: entry.industryHint, sourceRef: entry.ref };
    }
  }
}
