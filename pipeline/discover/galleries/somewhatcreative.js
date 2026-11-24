// SomeWhat Creative (somewhatcreative.net), a design blog whose monthly "31 of
// the Best Made Websites from <month>" posts have hand-picked about 30 sites
// each since January 2020 (Aya, Death to Robots, Olympic Subsea, Terreno
// Hotel...), about 2,500 in all. It runs on WordPress, so one REST request
// lists every post in its Websites category, newest first, with its content;
// each site is an <h2> that links out to it, and the post is the sourceRef.
// Affiliate links sit in paragraphs, not headings, so they are left out.
// Known domains are skipped downstream. robots.txt allows everything.
import * as cheerio from "cheerio";
import { fetchJson } from "../http.js";

const BASE = "https://www.somewhatcreative.net";
const WEBSITES_CATEGORY = 19;

export const name = "somewhatcreative";

export async function* listing({ limit }) {
  const posts = await fetchJson(`${BASE}/wp-json/wp/v2/posts?categories=${WEBSITES_CATEGORY}&per_page=100&orderby=date&order=desc&_fields=link,content`);
  let yielded = 0;
  for (const post of posts) {
    const $ = cheerio.load(post.content?.rendered || "");
    for (const a of $("h2 a[href^='http']").get()) {
      if (yielded >= limit) return;
      const url = $(a).attr("href");
      if (/^https?:\/\/([^/]+\.)?somewhatcreative\.net\b/i.test(url)) continue;
      yielded++;
      yield { url, name: $(a).text().trim() || null, sourceRef: post.link };
    }
  }
  if (!yielded) console.warn(`[${name}] no site headings in the Websites posts; the markup may have changed`);
}
