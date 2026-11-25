// CSS Winner Nominees (/nominees), every site submitted to CSS Winner, newest
// first: about 1,070 pages of 18 cards (roughly 19,000 sites back to 2009), in
// the same card markup as its Sites of the Day. Winners are among them; their
// detail pages are already stored by that adapter and get skipped, so this
// mostly reaches the nominees that won nothing, which the judge then scores.
// Past the last page the site serves a page without cards, which paged()
// stops on. robots.txt disallows only /cgi-bin/, /style/, /js/, /css/, /new/.
import { paged } from "./paged.js";
import { parseCards } from "./csswinner.js";

const BASE = "https://www.csswinner.com";

export const name = "csswinner-nominees";

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 1200,
    pageUrl: (n) => `${BASE}/nominees${n > 1 ? `/${n}` : ""}`,
    parse: parseCards,
  });
}
