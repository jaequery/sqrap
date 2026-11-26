// Portfolio Project (portfolioproject.io), a reviewed gallery of about 270
// portfolio sites of product designers, design engineers, motion designers and
// small studios (Halli, Evil Rabbit, Typical, Studio Jud), 2024 on and still
// growing in November 2026. Submissions are listed only once approved. The
// served home page carries every approved entry in its flight data (url, name,
// slug, type, styles), most recently reviewed first, so one request reads the
// whole gallery. Each host is yielded once, each /website/<slug> page kept as
// the sourceRef, every site tagged Agency & Portfolio. robots.txt carries only
// Cloudflare's content-signal comments and disallows nothing.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";
import { flightData, objectAt } from "./catalog.js";

const BASE = "https://portfolioproject.io";

export const name = "portfolioproject";

// The approved entries in a served page to { url, name, sourceRef }, one per host.
export function portfolios(html) {
  const text = flightData(cheerio.load(html));
  const seen = new Set();
  const out = [];
  for (const m of text.matchAll(/\{"id":"[0-9a-f-]{36}","url":"/g)) {
    const e = objectAt(text, m.index);
    if (!e || e.status !== "approved" || typeof e.url !== "string" || typeof e.slug !== "string") continue;
    let u;
    try {
      u = new URL(e.url.trim());
    } catch {
      continue;
    }
    if (!/^https?:$/.test(u.protocol) || /(^|\.)portfolioproject\.io$/i.test(u.hostname)) continue;
    u.searchParams.delete("ref");
    const key = u.hostname.toLowerCase().replace(/^www\./, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      url: u.href,
      name: typeof e.name === "string" && e.name.trim() ? e.name.trim() : null,
      sourceRef: `${BASE}/website/${encodeURIComponent(e.slug)}`,
    });
  }
  return out;
}

export async function* listing({ limit = Infinity } = {}) {
  const list = portfolios(await fetchHtml(`${BASE}/`));
  if (!list.length) console.warn(`[${name}] no portfolios in ${BASE}/; its markup may have changed`);
  for (const r of list.slice(0, limit)) yield { url: r.url, name: r.name, industryHint: "Agency & Portfolio", sourceRef: r.sourceRef };
}
