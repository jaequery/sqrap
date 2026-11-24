// Storefront Design (storefront.design), a hand-picked gallery of about 420
// design-led online stores: fashion, homewares, furniture, food and drink,
// skincare and type foundries (Polène, Dom Pérignon, Wrensilva, Koru...). It is
// a Next.js site whose served home page carries every submission in
// __NEXT_DATA__, each with its outbound `link` and style, industry and
// typography tags, so one request reads the whole gallery, no page per site
// exists and the home page is every entry's sourceRef. The industry tag is
// mapped to an industry, E-commerce when none fits. It serves no robots.txt
// (404), so everything is allowed.
import { fetchHtml } from "../http.js";
import { industryFromTags } from "../industry.js";

const BASE = "https://www.storefront.design/";

export const name = "storefront";

// Industry tags the keyword list misses. Every entry is a store, so a tag
// with no closer industry (sports, pets, art, type foundry...) is E-commerce.
const INDUSTRY = {
  consumable: "Food & Drink",
  homewares: "Architecture & Interior",
  skincare: "Health",
  fragrance: "Health",
  publications: "Media & Publishing",
};

function industryFromTag(tag) {
  const key = tag?.toLowerCase() ?? "";
  return INDUSTRY[key] ?? industryFromTags(key) ?? "E-commerce";
}

export async function* listing({ limit }) {
  const html = await fetchHtml(BASE);
  const json = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)?.[1];
  const submissions = json ? JSON.parse(json)?.props?.pageProps?.submissions : null;
  if (!Array.isArray(submissions) || !submissions.length) {
    console.warn(`[${name}] no submissions in ${BASE}; the page data may have changed`);
    return;
  }
  let yielded = 0;
  for (const s of submissions) {
    if (yielded >= limit) return;
    const url = s?.link?.trim();
    if (!url || !/^https?:\/\//i.test(url)) continue;
    const tag = (s.tags ?? []).find((t) => t?.parent === "industry")?.title;
    yielded++;
    yield { url, name: s.title?.trim() || null, industryHint: industryFromTag(tag), sourceRef: BASE };
  }
}
