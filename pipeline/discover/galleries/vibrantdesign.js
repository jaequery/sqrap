// Vibrant Design (vibrant.design), "a hand-picked gallery of the best design on the
// internet": Manu Arora (Aceternity UI) adds one pick a day since October 2026, as
// websites, page sections, launch videos and OG images. Its websites and sections,
// about 180 in late November 2026, are product, AI and fintech sites, studios and
// designer portfolios (Linear, Stripe, Apple, basement.studio, Rauno Freiberg,
// Lightspark, ToDesktop), each recorded as a short video of the page.
// The sitemap index points at its projects sitemaps, whose /website/<slug> pages are
// read newest lastmod first (sitemap order breaks ties), one request per page not yet
// stored as a site's sourceRef. Each page's served data carries the entry's
// `websiteUrl`. A section's is a page inside the site, often on an app or sign-in
// subdomain (linear.app/careers, auth.planetscale.com/sign-in), so a section keeps
// the registrable domain's home page instead (https://planetscale.com/); a site
// with several sections is yielded once a run. Its /feed/ items (shots and clips, mostly posts from X),
// launch videos and OG images are not read. An industry tag hints an industry, and a
// portfolio or agency type tags Agency & Portfolio. robots.txt allows the pages; its
// /api/ and /redirect/ paths are disallowed and not used. It keeps the normal
// quality bar.
import * as cheerio from "cheerio";
import { getDomain } from "tldts";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml } from "../http.js";
import { candidateDomain } from "../normalize.js";

const BASE = "https://vibrant.design";
const PAGE = /^\/website\/[a-z0-9-]+\/?$/;
const OWN = /(^|\.)vibrant\.design$/i;
// Staging hosts are never the site itself.
const NOT_THE_SITE = /(^|\.)(webflow\.io|framer\.website|framer\.app|vercel\.app)$/i;
const BATCH = 50;

export const name = "vibrantdesign";

// Industry tag slug (context "industry", free-form) to industry, first match wins.
const INDUSTRY_BY_TAG = [
  [/(^|-)(ai|artificial-intelligence|agents?)($|-)/, "AI"],
  [/developer|devtools?|infrastructure|api/, "Developer tools"],
  [/crypto|web3|blockchain/, "Crypto"],
  [/fintech|finance|payments?|banking/, "Finance"],
  [/e-?commerce|retail|shop/, "E-commerce"],
  [/fashion|apparel|jewel/, "Fashion"],
  [/food|drink|restaurant|coffee/, "Food & Drink"],
  [/health|medical|wellness|fitness/, "Health"],
  [/education|learning/, "Education"],
  [/music/, "Music"],
  [/travel|hospitality|hotel/, "Travel"],
  [/real-estate|architecture|interior/, "Architecture & Interior"],
  [/media|publishing|news/, "Media & Publishing"],
  [/entertainment|gaming|games?|film/, "Entertainment"],
  [/automotive|cars?$/, "Automotive"],
  [/productivity/, "Productivity"],
  [/saas|software/, "SaaS"],
  // Not "design", which also tags design tools and icon sets.
  [/creative-services|agency|studio|advertising|portfolio/, "Agency & Portfolio"],
];

// A projects sitemap to /website/ page URLs, newest lastmod first (sitemap order
// breaks ties).
export function pages(xml) {
  const $ = cheerio.load(xml, { xml: true });
  return $("url")
    .map((i, el) => {
      const loc = $(el).children("loc").first().text().trim();
      const lastmod = Date.parse($(el).children("lastmod").first().text().trim()) || 0;
      return { loc, lastmod, i };
    })
    .get()
    .filter(({ loc }) => {
      try {
        const u = new URL(loc);
        return OWN.test(u.hostname) && PAGE.test(u.pathname);
      } catch {
        return false;
      }
    })
    .sort((a, b) => b.lastmod - a.lastmod || a.i - b.i)
    .map(({ loc }) => loc);
}

// The sitemap index to its projects sitemaps.
export function projectSitemaps(xml) {
  const $ = cheerio.load(xml, { xml: true });
  return $("sitemap > loc")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((loc) => /\/sitemaps\/projects-\d+\.xml$/.test(loc));
}

const unquote = (s) => {
  try {
    return JSON.parse(`"${s}"`);
  } catch {
    return s;
  }
};

// A page's served data to its own entry: { name, url, format, tags }. The record starts at
// `path:"/website/<slug>"` and runs to its `related:` list, whose entries carry
// other sites' URLs and are not read.
export function entry(html, ref) {
  const path = new URL(ref).pathname.replace(/\/$/, "");
  const start = html.indexOf(`path:"${path}",name:"`);
  if (start < 0) return null;
  const end = html.indexOf("related:", start);
  const rec = html.slice(start, end < 0 ? start + 20000 : end);
  const url = rec.match(/websiteUrl:"((?:[^"\\]|\\.)+)"/)?.[1];
  if (!url) return null;
  const name = unquote(rec.match(/,name:"((?:[^"\\]|\\.)*)"/)?.[1] ?? "");
  const format = rec.match(/format:"([a-z-]+)"/)?.[1] ?? null;
  const tags = [...rec.matchAll(/context:"([a-z]+)",slug:"([^"]+)"/g)].map(([, context, slug]) => ({ context, slug }));
  return { url: unquote(url), name, format, tags };
}

// An entry's title to the site's name: a website's page title up to " | ", " — ",
// " – ", " · " or " - "; a section's "Linear's Careers Page" up to the possessive.
// Null when nothing is left.
export function siteName(title, format) {
  let head = (title || "").split(/\s+[|—–·-]\s+/)[0].trim();
  if (format === "section") head = head.replace(/[’'](s\s|\s).*$/, "").trim();
  return head || null;
}

export function industry(tags) {
  const industries = tags.filter((t) => t.context === "industry").map((t) => t.slug);
  for (const slug of industries) {
    for (const [re, label] of INDUSTRY_BY_TAG) if (re.test(slug)) return label;
  }
  if (tags.some((t) => t.context === "type" && /portfolio|agency|studio/.test(t.slug))) return "Agency & Portfolio";
  return null;
}

export async function* listing({ limit }) {
  const sitemaps = projectSitemaps(await fetchHtml(`${BASE}/sitemap.xml`));
  const refs = [];
  for (const sm of sitemaps) refs.push(...pages(await fetchHtml(sm)));
  if (!refs.length) {
    console.warn(`[${name}] no /website/ pages in the sitemap; its format may have changed`);
    return;
  }
  const domains = new Set();
  let yielded = 0;
  for (let i = 0; i < refs.length && yielded < limit; i += BATCH) {
    const batch = refs.slice(i, i + BATCH);
    const known = await knownSourceRefs(batch);
    for (const ref of batch) {
      if (yielded >= limit) return;
      if (known.has(ref)) continue;
      const e = entry(await fetchHtml(ref), ref);
      if (!e) continue;
      let url;
      let domain;
      try {
        const u = new URL(e.url);
        if (OWN.test(u.hostname) || NOT_THE_SITE.test(u.hostname)) continue;
        domain = candidateDomain(u.href);
        if (!domain) continue;
        url = e.format === "section" ? `https://${getDomain(u.hostname) ?? domain}/` : u.href;
      } catch {
        continue;
      }
      if (domains.has(domain)) continue;
      domains.add(domain);
      yielded++;
      yield { url, name: siteName(e.name, e.format), industryHint: industry(e.tags), sourceRef: ref };
    }
  }
}
