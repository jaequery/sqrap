// Awwwards Honorable Mentions (/websites/honorable/), sites the Awwwards jury
// scored well that did not win Site of the Day: about 10,000 of them, 31 a page,
// newest first, in the same card markup as Sites of the Day. The listing runs
// back to August 2022 in about 321 pages (page 100 is only mid-2025); a page past
// the end serves the last page again, which paged() stops on.
import { paged } from "./paged.js";
import { parseCards } from "./awwwards.js";

const BASE = "https://www.awwwards.com";

export const name = "awwwards-honorable";

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 400,
    pageUrl: (n) => `${BASE}/websites/honorable/${n > 1 ? `?page=${n}` : ""}`,
    parse: parseCards,
  });
}
