// Pure (purelanding.page), a landing page design gallery of about 5,200
// pages: startup, SaaS, AI and product sites, studio and personal portfolios
// and brand stores (Hyperliquid, Granola, Qatalog, Jacobsen Salt Co.,
// Spherical Waves...). It is a Framer site; its sitemap lists every
// /inspirations/<slug> page, newest first, and each page names the site in
// its h1, links to it with "Explore Site" and labels it with a Category
// (Landing, Portfolio, Ecommerce...) and Industry (AI, Tech, Finance...).
// Pages already stored as a site's sourceRef are not fetched again. The
// category maps to an industry first, then the industry labels. Website
// templates (Webflow and Framer template links, "template" in the title or
// slug) are skipped. robots.txt allows everything.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://purelanding.page";
const BATCH = 50;
const SITE_PAGE = /^https:\/\/purelanding\.page\/inspirations\/[^/?#]+$/;
// Template marketplaces and the gallery's own sponsors, never a listed site.
const NOT_A_SITE = /^https?:\/\/([^/]+\.)?(purelanding\.page|webflow\.com|framer\.link|framer\.com|deserve\.studio|tally\.so)(\/|$)/i;

export const name = "purelanding";

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const refs = [...new Set($map("loc").map((_, el) => $map(el).text().trim()).get().filter((u) => SITE_PAGE.test(u)))]
    .filter((u) => !/template/i.test(u));
  if (!refs.length) console.warn(`[${name}] no /inspirations/ pages in the sitemap; its format may have changed`);
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
      const $ = cheerio.load(html);
      const url = $("a[href^='http']").filter((_, a) => /explore site/i.test($(a).text())).first().attr("href")?.trim();
      if (!url || NOT_A_SITE.test(url)) continue;
      const title = $("h1").first().text().replace(/\s+/g, " ").trim();
      if (/\btemplate\b/i.test(title)) continue;
      // Each label is a <p> whose value sits in the next sibling block.
      const field = (label) => $("p").filter((_, p) => $(p).text().trim() === label).first().parent().next().text().trim();
      yielded++;
      yield {
        url,
        name: title.split(/\s+[|·–—-]\s+/)[0] || null,
        industryHint: industryFromTags(field("Category")) ?? industryFromTags(field("Industry")),
        sourceRef: ref,
      };
    }
  }
}
