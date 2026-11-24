// Country names or slugs ("Denmark", "united-kingdom", "usa") as ISO 3166-1
// alpha-2 codes, for gallery adapters that name a site's country. Built from
// the English region names Intl knows (current codes only, so "United Kingdom"
// is GB, not the reserved UK), plus the slugs those names do not produce.

const ALIASES = {
  usa: "US", "united-states-of-america": "US", england: "GB", scotland: "GB", wales: "GB",
  "northern-ireland": "GB", "the-netherlands": "NL", "czech-republic": "CZ", czechia: "CZ",
  "south-korea": "KR", korea: "KR", russia: "RU", turkey: "TR",
};

const slugify = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");

let codes;
export function countryCode(nameOrSlug) {
  if (!nameOrSlug) return null;
  const slug = slugify(nameOrSlug);
  if (ALIASES[slug]) return ALIASES[slug];
  if (!codes) {
    codes = new Map();
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b);
        const label = names.of(code);
        // Skip deprecated codes (UK, DD, FX...) whose canonical form is another region.
        if (Intl.getCanonicalLocales(`und-${code}`)[0] !== `und-${code}`) continue;
        if (label && label !== code) codes.set(slugify(label), code);
      }
    }
  }
  return codes.get(slug) || null;
}
