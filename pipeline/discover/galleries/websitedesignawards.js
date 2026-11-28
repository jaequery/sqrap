// Website Design Awards (websitedesignawards.com), a free daily award: one Site of
// the Day, and every site its jury scores 8.0 or more overall (design 35%,
// innovation 25%, usability and accessibility 20% each) joins the winners. Its
// picks since April 2026, about 130, are mostly design-led independent work:
// editorial and interactive pieces, product, developer tool and studio sites,
// portfolios (Stillwet, Are.na, fonts.xyz, Paper Shaders, Emerging Patterns).
// Its archive also reaches back to 2015 with a few winners a month, but those
// months were filled in later with well-known sites (MDN, Nike, Radix, Metalab),
// so the dates say little; they are read last. It was once passed over for being
// read from Supabase in the browser; its pages are now server-rendered, and each
// month's archive page, /archive/<yyyy>/<mm>, carries every winner of that month
// in its serialized route data (slug, url, title, category, award), so one
// request reads a month. The month list comes from /archive, newest first, and
// the months are read through the shared paged loop. Honorable mentions (7.0 to
// 7.9) are not on archive pages and are not read. An entry that is a page deep
// inside a site (stripe.com/sessions/2024) folds into the site's home page, as
// discovery keeps only that; one deep inside a shared host (x.github.io/clocks/)
// is skipped, since that host's root is someone else's page. Each /site/<slug>
// page is the sourceRef. It keeps the normal quality bar. robots.txt disallows
// only /api/.
import { getDomain } from "tldts";
import { fetchHtml } from "../http.js";
import { paged } from "./paged.js";

const BASE = "https://websitedesignawards.com";

export const name = "websitedesignawards";

// Its categories → lib/taxonomy.js INDUSTRIES. Experimental and Cultural carry
// no hint.
const INDUSTRY = {
  Agency: "Agency & Portfolio",
  Portfolio: "Agency & Portfolio",
  Commerce: "E-commerce",
  Developer: "Developer tools",
  Editorial: "Media & Publishing",
  Educational: "Education",
  Product: "SaaS",
};

const OWN = /(^|\.)websitedesignawards\.com$/i;

// A JS string literal's body from the serialized route data, unescaped.
function unquote(s) {
  try {
    return JSON.parse(`"${s}"`);
  } catch {
    return s;
  }
}

// The month pages listed on /archive, newest first.
export function months(html) {
  const seen = new Set();
  for (const m of html.matchAll(/href="\/archive\/(\d{4})\/(\d{2})"/g)) seen.add(`${m[1]}/${m[2]}`);
  return [...seen].sort().reverse().map((ym) => `${BASE}/archive/${ym}`);
}

const STR = '"((?:[^"\\\\]|\\\\.)*)"';
const ENTRY = new RegExp(`slug:${STR},url:${STR},title:${STR}`, "g");

// The winners in a month page's serialized route data, one per slug; the
// month's Site of the Month appears twice.
export function parse(html) {
  const text = typeof html === "string" ? html : "";
  const starts = [...text.matchAll(ENTRY)];
  const seen = new Set();
  const out = [];
  starts.forEach((m, i) => {
    const slug = unquote(m[1]);
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    // Category and award sit later in the same object, before the next entry.
    const rest = text.slice(m.index, starts[i + 1]?.index ?? m.index + 8000);
    const award = /award:"([a-z_]+)"/.exec(rest)?.[1];
    if (award === "honorable_mention") return;
    let site;
    try {
      site = new URL(unquote(m[2]).trim());
    } catch {
      return;
    }
    if (!/^https?:$/.test(site.protocol) || OWN.test(site.hostname)) return;
    const host = site.hostname.replace(/^www\./, "");
    const hosted = getDomain(host, { allowPrivateDomains: true }) !== getDomain(host);
    if (hosted && site.pathname.replace(/\/+$/, "")) return;
    const category = /category:"([^"]*)"/.exec(rest)?.[1];
    out.push({
      url: site.href,
      name: unquote(m[3]).trim() || null,
      industryHint: INDUSTRY[category] ?? null,
      sourceRef: `${BASE}/site/${encodeURIComponent(slug)}`,
    });
  });
  return out;
}

export async function* listing({ limit }) {
  const list = months(await fetchHtml(`${BASE}/archive`));
  if (!list.length) {
    console.warn(`[${name}] no months on ${BASE}/archive; its markup may have changed`);
    return;
  }
  yield* paged({
    name,
    limit,
    maxPages: list.length,
    pageUrl: (n) => list[n - 1],
    load: (url) => fetchHtml(url),
    parse,
  });
}
