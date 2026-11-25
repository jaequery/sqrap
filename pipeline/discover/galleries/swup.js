// Swup showcase (swup.js.org/showcase), sites built with the swup page-transition
// library that its maintainers accept on quality ("professional, visually
// appealing, and accessible"): architecture practices, museums, biennials and
// studios, about 30 of them. The docs site answers 503 at times, so the list is
// read from its source, one markdown file per site in src/showcase/ of the
// swup/docs repository on GitHub, whose front matter holds the title, url and
// date; newest first. Each file's GitHub page is the sourceRef, and files
// already stored as one are not fetched again. The template (_showcase.md) and
// README.md are skipped.
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml, fetchJson } from "../http.js";

const REPO = "swup/docs";
const BRANCH = "main";
const DIR = "src/showcase/";

const field = (text, key) => text.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1].trim().replace(/^["']|["']$/g, "") || null;

export const name = "swup";

export async function* listing({ limit }) {
  const tree = await fetchJson(`https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`, {
    headers: { accept: "application/vnd.github+json" },
  });
  const paths = (tree.tree ?? [])
    .map((t) => t.path)
    .filter((p) => p.startsWith(DIR) && p.endsWith(".md") && !p.slice(DIR.length).includes("/"))
    .filter((p) => !/^(_|README\.md$)/i.test(p.slice(DIR.length)));
  if (!paths.length) console.warn(`[${name}] no showcase files in ${REPO}/${DIR}; the repository layout may have changed`);
  const refOf = (p) => `https://github.com/${REPO}/blob/${BRANCH}/${p}`;
  const known = await knownSourceRefs(paths.map(refOf));
  const entries = [];
  for (const p of paths) {
    if (known.has(refOf(p))) continue;
    const md = await fetchHtml(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/${p}`);
    const front = md.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
    const url = field(front, "url");
    if (!url || !/^https?:\/\//.test(url)) continue;
    entries.push({ url, name: field(front, "title"), date: field(front, "date") ?? "", sourceRef: refOf(p) });
  }
  entries.sort((a, b) => b.date.localeCompare(a.date));
  for (const { date, ...entry } of entries.slice(0, limit)) yield entry;
}
