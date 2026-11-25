// Awwwards Nominees (/websites/nominees/), every site submitted to the
// Awwwards jury, newest first: about 320 pages of 31 cards (roughly 10,000
// sites), in the same card markup as Sites of the Day. Winners and Honorable
// Mentions are among them; their domains are already stored by those adapters
// and get skipped, so this mostly reaches the nominees that won nothing.
// Past the last page the site serves that page again, which paged() stops on.
// robots.txt only disallows /websites/? (the unfiltered listing's query).
import { paged } from "./paged.js";
import { parseCards } from "./awwwards.js";

const BASE = "https://www.awwwards.com";

export const name = "awwwards-nominees";

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 400,
    pageUrl: (n) => `${BASE}/websites/nominees/${n > 1 ? `?page=${n}` : ""}`,
    parse: parseCards,
  });
}
