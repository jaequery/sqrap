// BRIK GALLERY (brik.co.jp/gallery), a large Japanese web design gallery of
// about 13,000 corporate, brand, campaign and shop sites, mostly from Japan.
// /gallery?p=<n> lists 120 sites newest first, about 110 pages deep; every card
// links straight out to the site and to its /gallery/detail/<id> page, and
// lists its categories, the first one with a Sqrap equivalent mapped to
// industry. Banner cards ([PR]) have no detail page and are skipped, as are
// recruiting sites (新卒・中途採用サイト), which are mostly careers subpages of
// corporate sites. A page past the last one is empty. robots.txt is a 404, so
// everything is allowed.
import { paged } from "./paged.js";

const BASE = "https://brik.co.jp";
const RECRUITING = "新卒・中途採用サイト";

// BRIK category → lib/taxonomy.js INDUSTRIES. Broad ones (design, art and
// music; finance, law and HR; regional groups) are left unmapped.
const INDUSTRY = {
  "ECサイト": "E-commerce",
  "ファッション・ビューティー": "Fashion",
  "建設・住宅・不動産": "Real estate",
  "医療・ヘルスケア": "Health",
  "教育・学校": "Education",
  "飲食店・グルメ・ウェディング": "Food & Drink",
  "飲料・食品": "Food & Drink",
  "旅行・ホテル・観光": "Travel",
  "インテリア・家具・雑貨・家電": "Architecture & Interior",
  "自動車・乗り物・交通": "Automotive",
  "テレビ・アニメ・映画・芸能": "Entertainment",
  "メディアサイト": "Media & Publishing",
  "ポートフォリオ": "Agency & Portfolio",
};

export const name = "brik";

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 200,
    pageUrl: (n) => `${BASE}/gallery${n > 1 ? `?p=${n}` : ""}`,
    parse: ($) =>
      $(".c-gallery-list-item").map((_, el) => {
        const card = $(el);
        const url = card.find(".c-gallery-list-item__image a[href^='http']").attr("href");
        const detail = card.find(".c-gallery-list-item__title a[href^='/gallery/detail/']");
        if (!url || !detail.length) return null;
        const categories = card.find(".c-gallery-list-item__category").text().split("、").map((c) => c.trim());
        if (categories.includes(RECRUITING)) return null;
        return {
          url,
          name: detail.text().trim() || null,
          industryHint: categories.map((c) => INDUSTRY[c]).find(Boolean) || null,
          sourceRef: BASE + detail.attr("href"),
        };
      }).get(),
  });
}
