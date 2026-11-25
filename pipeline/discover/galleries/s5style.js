// S5-Style (s5-style.com), a Japanese web design gallery run since about 2012
// by S5 Studios. Its home page lists the "Good Web Design" picks of its
// official curators, about 7,200 corporate, brand, product, campaign, studio
// and shop sites (FOLTEK, Coalition, Kindai University's KINDAI GRAFFITI,
// Alessi's The Five Seasons, 60fps), mostly from Japan; /all/ adds users'
// own bookmarks, which are not read. The gallery was rebuilt as a Next.js site
// whose served `__NEXT_DATA__` carries every card on a page with the site's
// address, title, site type and industry categories, so no page per site is
// fetched. /page/<n>/ lists 120 picks newest first, about 60 pages deep; a
// page past the last one is a 404, which ends the listing. Each pick's
// /<id>/ page is kept as the source. Recruiting sites (採用･仕事･アルバイト
// サイト), mostly careers subpages of corporate sites, are skipped; the type
// (agency, portfolio, shop, SaaS, media), else the first category with a Sqrap
// equivalent, is mapped to industry. robots.txt allows everything but GPTBot.
import { paged } from "./paged.js";

const BASE = "https://www.s5-style.com";
const RECRUITING = "採用･仕事･アルバイトサイト";

// S5-Style site type → lib/taxonomy.js INDUSTRIES. Corporate, product,
// campaign, portal and landing-page types say nothing about the industry.
const TYPE_INDUSTRY = {
  "ECサイト": "E-commerce",
  "デザイン･制作･開発会社": "Agency & Portfolio",
  "ポートフォリオ･アーティストサイト": "Agency & Portfolio",
  "広告代理店": "Agency & Portfolio",
  "映像･写真プロダクション": "Agency & Portfolio",
  "Webアプリ･SaaS･サービスサイト": "SaaS",
  "オウンドメディアサイト": "Media & Publishing",
  "キュレーションメディアサイト": "Media & Publishing",
};

// S5-Style category → INDUSTRIES. Mixed ones (schools with medicine and
// welfare, IT, beauty and cosmetics, weddings, manufacturing) are unmapped.
const CATEGORY_INDUSTRY = {
  "ファッション": "Fashion",
  "ファッション レディース": "Fashion",
  "ファッション メンズ": "Fashion",
  "飲料･食品･メーカー": "Food & Drink",
  "商業施設･飲食店･カフェ･レストラン": "Food & Drink",
  "建築･建設･不動産･家": "Real estate",
  "インテリア･家具･雑貨": "Architecture & Interior",
  "バンド･音楽･レーベル": "Music",
  "ホテル･旅館": "Travel",
  "旅行･観光･航空･海運･交通": "Travel",
  "車･バイク･自転車": "Automotive",
  "テレビ･映画･アニメ": "Entertainment",
  "ゲーム•Eスポーツ": "Entertainment",
  "レジャー施設･テーマパーク": "Entertainment",
  "出版･印刷": "Media & Publishing",
  "SDGs･NPO･自治体": "Nonprofit",
  "金融･証券･保険･流通": "Finance",
};

export const name = "s5style";

const labels = (list) => (Array.isArray(list) ? list.map((x) => x?.label).filter(Boolean) : []);

// The picks in one listing page's __NEXT_DATA__, in the gallery's order.
export function picks(json) {
  let posts;
  try {
    posts = JSON.parse(json)?.props?.pageProps?.initialPostsRawData;
  } catch {
    return [];
  }
  if (!Array.isArray(posts)) return [];
  return posts
    .map((post) => {
      const url = post?.site_url?.trim();
      if (!/^https?:\/\//.test(url ?? "") || !post.id) return null;
      const types = labels(post.types);
      if (types.includes(RECRUITING)) return null;
      return {
        url,
        name: post.title?.trim() || null,
        industryHint:
          types.map((t) => TYPE_INDUSTRY[t]).find(Boolean) ||
          labels(post.categories).map((c) => CATEGORY_INDUSTRY[c]).find(Boolean) ||
          null,
        sourceRef: `${BASE}/${post.id}/`,
      };
    })
    .filter(Boolean);
}

export async function* listing({ limit }) {
  try {
    yield* paged({
      name,
      limit,
      maxPages: 120,
      pageUrl: (n) => (n > 1 ? `${BASE}/page/${n}/` : `${BASE}/`),
      parse: ($) => picks($("script#__NEXT_DATA__").text()),
    });
  } catch (err) {
    if (!/^HTTP 404 for .*\/page\/\d+\/$/.test(err.message)) throw err;
  }
}
