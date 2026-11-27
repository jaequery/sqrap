// Awesome Personal Websites (github.com/Arif-un/awesome-portfolio-websites), a
// hand-curated GitHub list of about 95 creative personal websites from designers and
// developers: Bruno Simon, Dennis Snellenberg, Lynn Fisher, Josh W. Comeau, Amelia
// Wattenberger, Daniel Korpai, Steven Mengin, Brad Frost... still added to in 2026.
// Its README lists every site as one Markdown link per row under a Developers or
// Designers heading, each row led by a flag image whose title names the person's
// country; the curator strikes a row through (~~...~~) once the site is gone. The raw
// file is fetched in one request (raw.githubusercontent.com has no robots.txt);
// known domains are skipped downstream. The repository page is the sourceRef.
import { countryCode } from "../country.js";
import { fetchHtml } from "../http.js";

const RAW = "https://raw.githubusercontent.com/Arif-un/awesome-portfolio-websites/main/README.md";
const REPO = "https://github.com/Arif-un/awesome-portfolio-websites";

export const name = "awesomeportfolios";

export function parse(markdown) {
  const entries = [];
  const seen = new Set();
  let inList = false;
  for (const line of markdown.split("\n")) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      inList = /developers|designers/i.test(heading[1]);
      continue;
    }
    if (!inList || !line.startsWith("- ") || line.includes("~~")) continue;
    const row = line.match(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/);
    if (!row) continue;
    let url;
    try {
      url = new URL(row[2]);
    } catch {
      continue;
    }
    const key = url.hostname.replace(/^www\./, "") + url.pathname.replace(/\/$/, "");
    if (seen.has(key)) continue; // a few people are listed as both developer and designer
    seen.add(key);
    entries.push({
      url: url.href,
      name: row[1].trim() || null,
      industryHint: "Agency & Portfolio",
      countryHint: countryCode(line.match(/<img[^>]*\btitle="([^"]+)"/)?.[1]),
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
