// Awesome Web Desktops (github.com/syxanash/awesome-web-desktops), a curated GitHub
// list of about 340 websites that mimic a desktop operating system: designers' and
// developers' portfolios (Dustin Mierau, Ash Kyd, KIM/OS, scott.is...), radio and
// music sites (Poolsuite, Nightwave Plaza) and web experiments (Windows 93, Webamp),
// with about 2,100 stars and still added to in 2026. Its README holds one table under
// "Websites", one row per site: a Markdown link to the live site, its source code and
// access notes; the curator monitors the links and moves dead ones to archived.md,
// which is not read. New rows are appended at the bottom, so rows are read bottom
// first to reach the newest additions first. Rows whose access note asks for a login
// or password are skipped (a capture would show only the sign-in screen). The raw file
// is fetched in one request (raw.githubusercontent.com has no robots.txt); known
// domains are skipped downstream. The repository page is the sourceRef.
import { fetchHtml } from "../http.js";

const RAW = "https://raw.githubusercontent.com/syxanash/awesome-web-desktops/main/README.md";
const REPO = "https://github.com/syxanash/awesome-web-desktops";

export const name = "webdesktops";

// Site names hinting at an industry; the rest are left to the classifier.
const NAME_HINT = [
  [/\b(radio|fm|music|mixtapes?|records?|dj)\b/i, "Music"],
  [/\b(portfolio|studio)\b/i, "Agency & Portfolio"],
];

export function parse(markdown) {
  const start = markdown.search(/^## Websites\s*$/m);
  if (start < 0) return [];
  const rest = markdown.slice(start);
  const end = rest.search(/^## Archived\s*$/m);
  const table = end < 0 ? rest : rest.slice(0, end);
  const entries = [];
  const seen = new Set();
  const rows = table.split("\n").filter((line) => /^\|?\s*\[/.test(line));
  for (const line of rows.reverse()) {
    const row = line.match(/^\|?\s*\[([^\]]+)\]\(\s*(https?:\/\/[^)\s]+)\s*\)/i);
    if (!row) continue;
    // [site, source, access notes]; a note about logging in means a sign-in wall.
    const notes = line.split("|").slice(2).join(" ");
    if (/\blog ?in\b|\bpassword\b|\bsign ?in\b/i.test(notes)) continue;
    let url;
    try {
      url = new URL(row[2]);
    } catch {
      continue;
    }
    if (!url.hostname.includes(".") || /(^|\.)github\.com$/i.test(url.hostname)) continue;
    const key = url.hostname.replace(/^www\./, "") + url.pathname.replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    const siteName = row[1].replace(/\\(.)/g, "$1").trim();
    entries.push({
      url: url.href,
      name: siteName || null,
      industryHint: NAME_HINT.find(([re]) => re.test(siteName))?.[1] ?? null,
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
