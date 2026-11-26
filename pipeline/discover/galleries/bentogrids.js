// Bento Grids (bentogrids.com), a hand-picked gallery of bento-grid layouts,
// most of them cut from product and marketing sites (Linear, Vercel, Attio,
// Clerk, Raycast, Mintlify, Neon, Liveblocks; about 190 "ui" shots, 2023 on).
// It was noted as not adaptable while it rendered client-side, but the served
// home page now carries every shot in its __NEXT_DATA__ (pageProps.shots:
// title, category, sourceLink), so one request reads the whole gallery. Only
// "ui" shots are read ("graphic" ones are Dribbble posters). Shots that link
// to Dribbble, X or Layers (a shots community, blocklisted with this adapter)
// are refused, and template demos on framer.website or webflow.io and
// component-library pages are skipped. Shots have no page of their own, so the
// gallery's home page is the sourceRef. Each host is yielded once, in the
// gallery's order (newest first). robots.txt only disallows two template
// sign-up pages.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";

const BASE = "https://bentogrids.com";

export const name = "bentogrids";

// Template demos and component docs, not sites.
const NOT_A_SITE = /^https?:\/\/(?:[^/]+\.(?:framer\.(?:website|app|ai)|webflow\.io)|[^/]*template[^/]*)(?:\/|$)|\/components?\//i;

// A shot's title to the site's name: "Bentos at Huly" gives Huly, a short
// title ("Tuple", "GlassFlow by @alex_barashkov") is the name itself, and a
// tagline ("Write better content Grow your audience faster") gives none.
function nameOf(title) {
  const t = String(title ?? "").replace(/\s+by\s+@\S+\s*$/i, "").trim();
  const at = t.match(/\s(?:at|from)\s+(.+)$/i)?.[1];
  if (at) return at.replace(/'s site$/i, "").trim() || null;
  return t && !/[:,]/.test(t) && t.split(/\s+/).length <= 3 ? t : null;
}

// The shots in a served page's __NEXT_DATA__ to { url, name }, one per host.
export function shots(html) {
  let data;
  try {
    data = JSON.parse(cheerio.load(html)("script#__NEXT_DATA__").first().text() || "null");
  } catch {
    return [];
  }
  const list = data?.props?.pageProps?.shots;
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const s of list) {
    if (s?.category !== "ui" || typeof s.sourceLink !== "string") continue;
    let u;
    try {
      u = new URL(s.sourceLink.trim());
    } catch {
      continue;
    }
    if (!/^https?:$/.test(u.protocol) || /(^|\.)bentogrids\.com$/i.test(u.hostname) || NOT_A_SITE.test(u.href)) continue;
    const key = u.hostname.toLowerCase().replace(/^www\./, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ url: u.href, name: nameOf(s.title) });
  }
  return out;
}

export async function* listing({ limit = Infinity } = {}) {
  const pageUrl = `${BASE}/`;
  const list = shots(await fetchHtml(pageUrl));
  if (!list.length) console.warn(`[${name}] no shots in ${pageUrl}; its markup may have changed`);
  for (const s of list.slice(0, limit)) yield { url: s.url, name: s.name, sourceRef: pageUrl };
}
