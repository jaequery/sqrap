// Tailwind CSS's showcase (tailwindcss.com/showcase), about 45 sites built with
// Tailwind that its team picks for the page: product and developer-tool sites
// (Cursor, Vercel, Supabase, PostHog, Resend, Mux),
// fintech (Column, Wealthfront), news (The Verge, Der Spiegel, Mashable),
// conferences and culture (Google I/O, NASA JPL, National Park Foundation,
// Feastables). The page used to render client-side; it now serves every card
// in its HTML, so the whole showcase comes from one request. Each card links
// straight out to the site and labels it ("Developer tool website", "Fintech
// marketing website", "News website"...), which hints the industry. Cards
// labeled "Template" are Tailwind's own templates on tailwindui.com and are
// skipped, and so are the sponsor cards mixed into the grid (Railway, Fin),
// which link without the utm_source=tailwindcss every showcase card carries.
// A few cards link through a go.<company> marketing redirect; those
// become the company's own home page. There is no robots.txt (the path serves
// the site's 404 page). The listing page is every entry's sourceRef.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://tailwindcss.com";
const OWN = /^https?:\/\/([^/]+\.)?(tailwindcss|tailwindui)\.com\b/i;

export const name = "tailwind";

// Card labels the shared keyword map misses or would read wrong, renamed to one
// it reads right.
const ALIASES = [
  [/\bhosting\b|\bdocumentation\b|\bsoftware framework\b|\bcode editor\b/, "developer tools"],
  [/\bcms\b/, "software"],
  [/\bvacation rental\b/, "travel"],
];

function industry(label) {
  let text = label.toLowerCase();
  for (const [re, to] of ALIASES) text = text.replace(re, to);
  return industryFromTags(text);
}

// The site a card links to, with Tailwind's utm_source dropped and a
// go.<company>.com/<campaign> link turned into https://<company>.com/.
export function siteUrl(href) {
  let u;
  try {
    u = new URL(href);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(u.protocol)) return null;
  if (/^go\./i.test(u.hostname)) return `https://${u.hostname.slice(3)}/`;
  u.searchParams.delete("utm_source");
  return u.href;
}

export function parse($, pageUrl) {
  const seen = new Set();
  return $("a.absolute.inset-0[href*='utm_source=tailwindcss']").map((_, el) => {
    const link = $(el);
    const card = link.parent();
    const label = card.find("p").first().text().trim();
    if (/^template$/i.test(label)) return null;
    const url = siteUrl(link.attr("href")?.trim() ?? "");
    if (!url || OWN.test(url) || seen.has(url)) return null;
    seen.add(url);
    return {
      url,
      name: card.find("h2").first().text().trim() || null,
      industryHint: label ? industry(label) : null,
      sourceRef: pageUrl,
    };
  }).get().filter(Boolean);
}

export async function* listing({ limit }) {
  const url = `${BASE}/showcase`;
  let entries;
  try {
    entries = parse(cheerio.load(await fetchHtml(url)), url);
  } catch (err) {
    console.warn(`[${name}] skipping: ${err.message}`);
    return;
  }
  if (!entries.length) console.warn(`[${name}] no sites on ${url}; the showcase markup may have changed`);
  yield* entries.slice(0, limit);
}
