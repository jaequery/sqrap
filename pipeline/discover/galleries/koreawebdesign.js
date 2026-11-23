// Korea Web Design (koreawebdesign.com), a Korean gallery that has picked a
// "site of the day" since 2014: brand, corporate, studio, shopping and
// automotive sites (Studio OKGO, UNIX, Hanwha Life...), about 700 PC sites,
// updated through November 2026. Its posts are read newest first from the
// WordPress REST API, filtered to the 웹사이트 category (2), 100 a request, so
// the whole gallery takes eight requests: each post's ACF `url` field is the
// site, so no post page is fetched. The mobile-site category repeats PC entries
// and is left out. The industry category ids (children of 카테고리, 3) are
// mapped to an industry; corporate, government, culture, services and the like
// carry no hint. Recruiting sites (채용) are skipped. robots.txt disallows only
// /wp-admin/, /wp-includes/ and community search.
import * as cheerio from "cheerio";
import { fetchJson } from "../http.js";

const API = "https://koreawebdesign.com/wp-json/wp/v2/posts";
const SITES_CATEGORY = 2;
const PER_PAGE = 100;
const MAX_PAGES = 20;

export const name = "koreawebdesign";

// Korea Web Design category id → lib/taxonomy.js INDUSTRIES.
const INDUSTRY = {
  4: "Health", // health 건강/의료
  5: "Architecture & Interior", // architecture 건축/건설/에너지
  6: "Entertainment", // games 게임
  8: "Education", // education 교육
  81: "Finance", // finance 금융/부동산
  11: "Media & Publishing", // magazine 매거진
  13: "Media & Publishing", // broadcasting 방송/통신
  14: "Media & Publishing", // blogging 블로그
  17: "E-commerce", // shopping 쇼핑
  119: "Agency & Portfolio", // agency 에이전시
  20: "Travel", // travel 여행
  21: "Entertainment", // movies 영화
  23: "E-commerce", // retail 유통
  19: "Food & Drink", // food 음식/음료
  24: "Music", // music 음악
  26: "Automotive", // automotive 자동차/항공/조선
  28: "Fashion", // fashion 패션/화장품
};

export async function* listing({ limit }) {
  let yielded = 0;
  for (let page = 1; page <= MAX_PAGES && yielded < limit; page++) {
    const posts = await fetchJson(`${API}?categories=${SITES_CATEGORY}&per_page=${PER_PAGE}&page=${page}&_fields=link,title,categories,acf.url`);
    if (!Array.isArray(posts) || !posts.length) {
      if (page === 1) console.warn(`[${name}] no posts from ${API}; its API may have changed`);
      return;
    }
    for (const p of posts) {
      if (yielded >= limit) return;
      const url = p?.acf?.url?.trim();
      if (!url || !/^https?:\/\//i.test(url) || typeof p.link !== "string") continue;
      const title = cheerio.load(p.title?.rendered ?? "").text().trim();
      if (/채용/.test(title)) continue;
      yielded++;
      yield {
        url,
        name: title || null,
        industryHint: (p.categories ?? []).map((id) => INDUSTRY[id]).find(Boolean) ?? null,
        sourceRef: p.link,
      };
    }
    if (posts.length < PER_PAGE) return;
  }
}
