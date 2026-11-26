// THE INDEX (theindex.website), a hand-picked directory of about 80 design
// studios and type foundries with a strong body of work: Bakken & Bæck, Base
// Design, Porto Rocha, Instrument, Dinamo, Commercial Type, Zak Group, Norgram,
// Random Studio... Each studio names its website, city, country and
// disciplines (graphic, digital and type design, branding, creative
// direction). The home page is a Next.js page whose served `__NEXT_DATA__`
// carries every studio, so the whole directory comes from one request. Each
// studio's own page, theindex.website/studio/<slug>, is the sourceRef; the
// first listed location gives the country. One studio links through
// shorturl.at, which sits behind a bot challenge and is refused downstream as
// an unresolved redirect; known domains are skipped downstream. There is no
// robots.txt (the path serves the site's 404 page).
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";
import { countryCode } from "../country.js";

const BASE = "https://theindex.website";

export const name = "theindex";

// The studios in the page's __NEXT_DATA__, in its order, one per URL.
export function studios(json) {
  let list;
  try {
    list = JSON.parse(json)?.props?.pageProps?.pageData?.studios;
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const entries = [];
  for (const studio of list) {
    const url = studio?.websiteUrl?.trim();
    if (!url || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    const slug = studio.slug?.current;
    const country = studio.locations?.[0]?.country || studio.country?.split(",")[0];
    entries.push({
      url,
      name: studio.name?.trim() || null,
      industryHint: "Agency & Portfolio",
      countryHint: countryCode(country?.trim()),
      sourceRef: slug ? `${BASE}/studio/${encodeURIComponent(slug)}` : `${BASE}/`,
    });
  }
  return entries;
}

export async function* listing({ limit }) {
  let entries;
  try {
    entries = studios(cheerio.load(await fetchHtml(`${BASE}/`))("script#__NEXT_DATA__").text());
  } catch (err) {
    console.warn(`[${name}] skipping: ${err.message}`);
    return;
  }
  if (!entries.length) console.warn(`[${name}] no studios in ${BASE}/'s page data; the markup may have changed`);
  yield* entries.slice(0, limit);
}
