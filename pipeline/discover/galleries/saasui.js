// SaaS UI (saasui.design), a library of real screens from about 170 SaaS
// products (Attio, Airtable, Cal.com, Linear and the like). Its sitemap lists
// every /application/<slug> page with a lastmod, read newest first. Each page's
// "Visit Website" link goes straight to the product and its breadcrumb carries
// a /category/<slug> label (CRM, Analytics, ...), mapped to an industry with
// SaaS as the fallback. Pages already stored as a site's sourceRef are not
// fetched again.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://www.saasui.design";
const BATCH = 50;

export const name = "saasui";

export async function* listing({ limit }) {
  const $map = cheerio.load(await fetchHtml(`${BASE}/sitemap.xml`), { xml: true });
  const latest = new Map();
  $map("url").each((_, el) => {
    const ref = $map(el).find("loc").text().trim();
    if (!/^https:\/\/www\.saasui\.design\/application\/[^/]+$/.test(ref)) return;
    const mod = $map(el).find("lastmod").text().trim();
    if (!latest.has(ref) || mod > latest.get(ref)) latest.set(ref, mod);
  });
  const refs = [...latest].sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0)).map(([ref]) => ref);
  if (!refs.length) console.warn(`[${name}] no /application/ pages in the sitemap; its format may have changed`);
  let yielded = 0;
  for (let i = 0; i < refs.length && yielded < limit; i += BATCH) {
    const batch = refs.slice(i, i + BATCH);
    const known = await knownSourceRefs(batch);
    for (const ref of batch) {
      if (yielded >= limit) return;
      if (known.has(ref)) continue;
      const $ = cheerio.load(await fetchHtml(ref));
      const visit = $("a[href^='http']").filter((_, a) => /^\s*visit website\s*$/i.test($(a).text())).first();
      const url = visit.attr("href");
      if (!url) continue;
      const category = $("nav a[href^='/category/']").first().text().trim();
      const title = $("nav span.text-foreground").last().text().trim();
      yielded++;
      yield { url, name: title || null, industryHint: industryFromTags(category) || "SaaS", sourceRef: ref };
    }
  }
}
