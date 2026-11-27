// web-avant-gardes (github.com/gsbm/web-avant-gardes), a hand-curated list of
// about 540 experimental, radical or unorthodox websites: designers',
// photographers' and developers' portfolios (Aristide Benoist, Armin Unruh...),
// design studios and type foundries (Studio Dumbar, Experimental Jetset, 205TF,
// Base...), shops and furniture brands, and art centers, magazines, bands and
// festivals. Its README lists every site in one file, one Markdown link per
// line under a category heading, with a short description in parentheses and
// a `DOWN` label on the ones the curator found dead. The raw file is fetched
// in one request (raw.githubusercontent.com has no robots.txt); its last entry
// was added in November 2022, so known domains are skipped downstream and the
// rows marked DOWN are skipped here. The repository page is the sourceRef.
import { fetchHtml } from "../http.js";

const RAW = "https://raw.githubusercontent.com/gsbm/web-avant-gardes/master/README.md";
const REPO = "https://github.com/gsbm/web-avant-gardes";

export const name = "webavantgardes";

// The category headings that hold sites, mapped to an industry (null: the
// row's description decides). Other headings ("Start hunting" lists showcase
// galleries) are skipped.
const SECTION = {
  "personal pages, portfolios": "Agency & Portfolio",
  "studios, agencies": "Agency & Portfolio",
  "shops, furnitures": "E-commerce",
  miscellaneous: null,
  unclassified: null,
};

// Row descriptions ("Art magazine", "Band tour", "Architecture studio"...),
// mapped to an industry.
const DESCRIPTION = [
  [/magazine|journal|publish|editorial|newspaper|\bbooks?\b/i, "Media & Publishing"],
  [/\bband\b|music|record|label|\bdj\b|musician|singer/i, "Music"],
  [/architect|interior/i, "Architecture & Interior"],
  [/fashion|apparel|clothing/i, "Fashion"],
  [/restaurant|food|ice ?cream|bakery|\bbar\b|coffee|wine/i, "Food & Drink"],
  [/\bshop\b|store|furniture/i, "E-commerce"],
  [/school|education|university|academy|course/i, "Education"],
  [/film|movie|festival|theat(er|re)|museum|exhibition|art (center|centre|event|fair)/i, "Entertainment"],
  [/studio|agency|designer|photographer|developer|portfolio|foundry/i, "Agency & Portfolio"],
];

export function parse(markdown) {
  const entries = [];
  const seen = new Set();
  let section = null;
  for (const line of markdown.split("\n")) {
    const heading = line.match(/^#{2,3}\s+(.+?)\s*$/);
    if (heading) {
      section = Object.hasOwn(SECTION, heading[1].toLowerCase()) ? heading[1].toLowerCase() : null;
      continue;
    }
    const row = line.match(/^-\s+(?:`★`\s+)?\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)(.*)$/);
    if (!row || section === null || /`DOWN/.test(row[3])) continue;
    const url = row[2];
    if (/^https?:\/\/([^/]+\.)?(github\.com|wikipedia\.org)\b/i.test(url) || seen.has(url)) continue;
    seen.add(url);
    const description = row[3].replace(/<br>|`[^`]*`/g, "").match(/\(([^)]+)\)/)?.[1] ?? "";
    entries.push({
      url,
      name: row[1].trim() || null,
      industryHint: SECTION[section] ?? DESCRIPTION.find(([re]) => re.test(description))?.[1] ?? null,
      sourceRef: REPO,
    });
  }
  return entries;
}

export async function* listing({ limit }) {
  const entries = parse(await fetchHtml(RAW));
  if (!entries.length) console.warn(`[${name}] no site rows in ${RAW}; the list format may have changed`);
  yield* entries.slice(0, limit);
}
