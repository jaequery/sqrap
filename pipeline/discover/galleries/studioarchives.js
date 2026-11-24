// Studio Archives (studioarchives.netlify.app), "a map of the world's design
// studios": a hand-picked index of about 220 independent design and branding
// studios in some 35 countries (Anagrama, Collins, Base Design, Bibliothèque,
// A Friend of Mine...), filed by discipline, country and sector. Its one page
// carries the whole list as a STUDIOS array in an inline script, each entry
// with the studio's name (n), site (u) and country (co), so no page per studio
// is fetched; the page is every entry's sourceRef. Countries are mapped to ISO
// codes and every studio is Agency & Portfolio. There is no robots.txt.
import { countryCode } from "../country.js";
import { fetchHtml } from "../http.js";

const BASE = "https://studioarchives.netlify.app";

export const name = "studioarchives";

// One JS string literal's body, unescaped.
const str = (body) => {
  try {
    return JSON.parse(`"${body}"`);
  } catch {
    return body;
  }
};
const field = (entry, key) => {
  const m = new RegExp(`(?:[{,]\\s*)${key}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(entry);
  return m ? str(m[1]).trim() : null;
};

function studios(html) {
  const start = html.indexOf("const STUDIOS=[");
  if (start < 0) return [];
  const end = html.indexOf("];", start);
  const body = html.slice(start, end < 0 ? undefined : end);
  // Entries hold arrays but no nested objects, so each runs to the first "}".
  return [...body.matchAll(/\{n:"[^{}]*\}/g)].map(([entry]) => ({
    name: field(entry, "n"),
    url: field(entry, "u"),
    country: field(entry, "co"),
  }));
}

export async function* listing({ limit }) {
  const pageUrl = `${BASE}/`;
  const list = studios(await fetchHtml(pageUrl)).filter((s) => /^https?:\/\//.test(s.url ?? ""));
  if (!list.length) console.warn(`[${name}] no STUDIOS list in the page; its markup may have changed`);
  for (const s of list.slice(0, limit)) {
    yield {
      url: s.url,
      name: s.name || null,
      industryHint: "Agency & Portfolio",
      countryHint: countryCode(s.country),
      sourceRef: pageUrl,
    };
  }
}
