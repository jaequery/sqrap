// Portfolio Ideas (github.com/Evavic44/portfolio-ideas), a curated GitHub list of
// about 420 portfolio websites from developers and designers, picked as inspiration
// for building one's own (Brittany Chiang, Kent C. Dodds, Cassidy Williams, Lee
// Robinson, Josh W. Comeau...), with about 6,400 stars and still added to in 2026.
// Its README holds one table between the PORTFOLIO LINE START and END comments, one
// row per site: author, screenshot, a Markdown link to the live site, repository and
// tech stack. New rows are appended at the bottom, so rows are read bottom first to
// reach the newest additions first. A few live links lack a scheme and get https://.
// Many sites sit on shared hosts (vercel.app, netlify.app, github.io), which gallery
// candidates may use. The raw file is fetched in one request (raw.githubusercontent.com
// has no robots.txt); known domains are skipped downstream. The repository page is the
// sourceRef.
import { fetchHtml } from "../http.js";

const RAW = "https://raw.githubusercontent.com/Evavic44/portfolio-ideas/main/README.md";
const REPO = "https://github.com/Evavic44/portfolio-ideas";

export const name = "portfolioideas";

// The live site of one table row, as an http(s) URL; null for anything else.
function liveUrl(cell) {
  const href = cell.match(/\]\(\s*([^)\s]+)\s*\)/)?.[1];
  if (!href) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(href) ? href : `https://${href.replace(/^\/+/, "")}`);
    return /^https?:$/.test(url.protocol) && url.hostname.includes(".") ? url : null;
  } catch {
    return null;
  }
}

export function parse(markdown) {
  const start = markdown.indexOf("PORTFOLIO LINE START");
  const end = markdown.indexOf("PORTFOLIO LINE END");
  if (start < 0 || end < start) return [];
  const entries = [];
  const seen = new Set();
  const rows = markdown.slice(start, end).split("\n").filter((line) => line.startsWith("|"));
  for (const line of rows.reverse()) {
    const cells = line.split("|").map((c) => c.trim());
    // ["", author, screenshot, live URL, repo, stack, ""]; the header and rule rows have no link.
    const url = cells.length >= 5 ? liveUrl(cells[3]) : null;
    if (!url) continue;
    const key = url.hostname.replace(/^www\./, "") + url.pathname.replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({
      url: url.href,
      name: cells[1] || null,
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
