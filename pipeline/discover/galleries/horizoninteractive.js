// Horizon Interactive Awards (horizoninteractiveawards.com), an international
// web and interactive media competition running since 2001. Each year's winners
// showcase links one page per web site category (Agency, E-Commerce, Travel...),
// and each of those pages lists its Gold winners (Cartier, Pandora, Honda
// Powersports, studios, museums, universities), plus the odd competition-wide
// special award, as blocks whose title links straight to the site. Only Gold
// and the Best Overall Design award are read (special awards for video are
// skipped): about 80 to 100 sites a year. Years are read newest first and stop at
// the first one whose showcase has no web category pages (2022 and before use
// older markup), so about three years are covered. The category maps to
// industry. robots.txt allows everything but /dashboard/ and three archived
// winners folders.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

const BASE = "https://www.horizoninteractiveawards.com";
const KEEP = /gold|overall design/i;

export const name = "horizoninteractive";

// Web site category slug → lib/taxonomy.js INDUSTRIES. Broad categories
// (B2B, Consumer Information, Government, Legal, Professional Services,
// Promotional, Responsive...) carry no hint.
const INDUSTRY = {
  agency: "Agency & Portfolio",
  "self-promotion": "Agency & Portfolio",
  "arts-activism": "Nonprofit",
  "non-profit": "Nonprofit",
  bank: "Finance",
  "e-commerce": "E-commerce",
  entertainment: "Entertainment",
  games: "Entertainment",
  sports: "Entertainment",
  health: "Health",
  "magazine-news": "Media & Publishing",
  "real-estate": "Real estate",
  restaurant: "Food & Drink",
  "school-university": "Education",
  training: "Education",
  software: "SaaS",
  travel: "Travel",
};

const SHOWCASE = /\/(\d{4})\/winners_showcase\/?$/;

// Showcase years, newest first. The home page links only the latest showcase
// and the sitemap lags a year behind, so both are read.
async function years() {
  const found = new Set();
  try {
    const $ = cheerio.load(await fetchHtml(`${BASE}/`));
    $("a[href]").each((_, a) => { const y = Number($(a).attr("href").match(SHOWCASE)?.[1]); if (y) found.add(y); });
  } catch (err) {
    console.warn(`[${name}] skipping the home page: ${err.message}`);
  }
  try {
    const $ = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
    $("url > loc").each((_, el) => { const y = Number($(el).text().trim().match(SHOWCASE)?.[1]); if (y) found.add(y); });
  } catch (err) {
    console.warn(`[${name}] skipping the sitemap: ${err.message}`);
  }
  return [...found].sort((a, b) => b - a);
}

const text = (s) => s.replace(/\s+/g, " ").trim();

export async function* listing({ limit }) {
  const all = await years();
  if (!all.length) console.warn(`[${name}] no winners showcases on the home page or in the sitemap; their format may have changed`);
  let yielded = 0;
  for (const year of all) {
    const showcase = `${BASE}/${year}/winners_showcase`;
    let $s;
    try {
      $s = cheerio.load(await fetchHtml(showcase));
    } catch (err) {
      console.warn(`[${name}] skipping ${showcase}: ${err.message}`);
      continue;
    }
    const categories = [...new Set($s(`a[href^="/web-site-awards/${year}/"]`).map((_, a) => $s(a).attr("href").replace(/\/+$/, "")).get())];
    if (!categories.length) {
      if (year === all[0]) console.warn(`[${name}] no web site categories on ${showcase}; the markup may have changed`);
      return;
    }
    for (const path of categories) {
      if (yielded >= limit) return;
      const page = `${BASE}${path}`;
      let $;
      try {
        $ = cheerio.load(await fetchHtml(page));
      } catch (err) {
        console.warn(`[${name}] skipping ${page}: ${err.message}`);
        continue;
      }
      const slug = path.split("/").pop();
      let section = "";
      for (const el of $("h4, .winner-block").get()) {
        if (el.tagName === "h4") {
          section = text($(el).text());
          continue;
        }
        if (!KEEP.test(section) || /video/i.test(section)) continue;
        if (yielded >= limit) return;
        const link = $(el).find(".winner-desc a[href]").first();
        // Some hrefs end in a stray &nbsp;.
        let url = String(link.attr("href") ?? "").replace(/&nbsp;|\u00a0/g, "").trim();
        if (/^www\./i.test(url)) url = `https://${url}`;
        if (!/^https?:\/\/[^/]+\.[^/]+/i.test(url) || /^https?:\/\/([^/]+\.)?horizoninteractiveawards\.com\b/i.test(url)) continue;
        yielded++;
        yield {
          url,
          name: text(link.text()) || null,
          industryHint: INDUSTRY[slug] ?? null,
          sourceRef: page,
        };
      }
    }
  }
}
