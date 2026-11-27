// Designer Portfolios (github.com/mejed-alkoutaini/designer-portfolios), a hand-picked
// GitHub list of about 115 portfolio websites from UI, product, brand and web designers
// and small studios: Bruno Simon, Dennis Snellenberg, Niccolò Miranda, Stas Bondar,
// Peter Tarka, Daniel Eden, Jan Losert, Local Studio... started in January 2025 and still
// added to in 2026. Its README lists every site as one Markdown link per row
// ("- [Name](url) [role]"); new rows are appended at the bottom, so rows are read bottom
// first to reach the newest additions first. Rows that point at a profile rather than a
// site of the designer's own (Behance, bento.me) are skipped. The raw file is fetched in
// one request (raw.githubusercontent.com has no robots.txt); known domains are skipped
// downstream. The repository page is the sourceRef.
import { fetchHtml } from "../http.js";

const RAW = "https://raw.githubusercontent.com/mejed-alkoutaini/designer-portfolios/master/README.md";
const REPO = "https://github.com/mejed-alkoutaini/designer-portfolios";

// Profile hosts, not a designer's own site.
const PROFILE_HOSTS = /(^|\.)(behance\.net|bento\.me|dribbble\.com|linkedin\.com|read\.cv)$/i;

export const name = "designerportfolios";

export function parse(markdown) {
  const entries = [];
  const seen = new Set();
  const rows = markdown.split("\n").filter((line) => /^\s*[-*]\s+\[/.test(line));
  for (const line of rows.reverse()) {
    if (line.includes("~~")) continue;
    const row = line.match(/\[([^\]]+)\]\(\s*(https?:\/\/[^)\s]+)\s*\)/i);
    if (!row) continue;
    let url;
    try {
      url = new URL(row[2]);
    } catch {
      continue;
    }
    if (!url.hostname.includes(".") || PROFILE_HOSTS.test(url.hostname)) continue;
    const key = url.hostname.replace(/^www\./, "") + url.pathname.replace(/\/$/, "");
    if (seen.has(key)) continue; // a few sites are listed twice under different names
    seen.add(key);
    // "Redoyanul Haque(best portfolio)" -> "Redoyanul Haque"
    const label = row[1].replace(/\s*\([^)]*\)\s*$/, "").trim();
    entries.push({
      url: url.href,
      name: label || null,
      industryHint: "Agency & Portfolio",
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
