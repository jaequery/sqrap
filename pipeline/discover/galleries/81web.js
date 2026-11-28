// 81-web.com, a Japanese web design gallery (named for Japan's calling code) that
// picks only Japanese sites, "厳選して掲載", since 2010: about 5,500 corporate,
// brand and service sites, shops, studios and media (SmartHR, New Balance Japan,
// KDDI, TVer), several a day, still added in November 2026. The site is a
// client-rendered Nuxt app (so it was once passed over), but its gallery comes
// from a same-origin JSON endpoint, /api/toppage_v2?paged=<n>, 24 posts a page
// newest first, each with the site's address, its industry category, its site
// type and the production credit. It is read through the shared paged loop
// back to the first picks of November 2010, page 231 today; the page past the
// last answers an empty list, which ends the listing.
// Recruiting sites are skipped, and so are campaign pages that live inside a
// brand's site (adidas.jp/JFA/) rather than on a domain of their own. The page
// /sites/<postID>/ is the sourceRef. robots.txt allows everything.
import * as cheerio from "cheerio";
import { fetchHtml } from "../http.js";
import { paged } from "./paged.js";

const BASE = "https://81-web.com";

export const name = "81web";

// 81-web category slug (catCatSlug) → lib/taxonomy.js INDUSTRIES. Machinery,
// electronics, consulting, HR, farming, stores and the like carry no hint.
const INDUSTRY = {
  "planning-production-development": "Agency & Portfolio", // 企画・制作・開発
  "food-drink": "Food & Drink", // 飲料・食品
  architecture: "Architecture & Interior", // 暮らし・建築・不動産
  "interior-goods": "Architecture & Interior", // インテリア・雑貨
  "school-establishment": "Education", // 学校・教育機関
  fashion: "Fashion", // ファッション
  "health-hospital": "Health", // 健康・医療・病院
  "cosmetic-beauty": "Health", // コスメティック・美容
  "finance-stock-insurance": "Finance", // 金融・証券・保険・法律
  "travel-traffic": "Travel", // 旅行・宿泊施設・交通機関
  service: "SaaS", // Webサービス・アプリ
  music: "Music", // 音楽
  "car-bike-bicycle": "Automotive", // 自動車・バイク・自転車
  "publishing-printing": "Media & Publishing", // 編集・出版・印刷
  "screen-entertainment": "Entertainment", // TV・映画・芸能
  entertainment: "Entertainment", // アニメ・ゲーム・おもちゃ
  "community-organizations": "Nonprofit", // 地域・行政・福祉
};

// Site type slug (catTypeSlug) → industry, when the category gave none.
const TYPE_INDUSTRY = {
  "electronic-commerce-site": "E-commerce", // ECサイト
  "web-media-site": "Media & Publishing", // Webメディア
  "portfolio-site": "Agency & Portfolio", // ポートフォリオサイト
};

const RECRUITING = /採用|リクルート|recruit|careers?\b/i;

export function parse(data) {
  return (Array.isArray(data?.posts) ? data.posts : []).map((p) => {
    if (p?.ad || !p?.postID || typeof p.siteUrl !== "string") return null;
    let site;
    try {
      site = new URL(p.siteUrl.trim());
    } catch {
      return null;
    }
    if (!/^https?:$/.test(site.protocol) || /(^|\.)81-web\.com$/i.test(site.hostname)) return null;
    const types = p.catTypeSlug ?? [];
    const title = cheerio.load(p.title ?? "").text().replace(/\s+/g, " ").trim();
    if (types.includes("recruitment-site") || RECRUITING.test(title) || RECRUITING.test(site.hostname + site.pathname)) return null;
    if (types.includes("campaign-site") && site.pathname.replace(/\/(index\.html?)?$/, "") !== "") return null;
    return {
      url: site.href,
      name: title || null,
      industryHint:
        (p.catCatSlug ?? []).map((s) => INDUSTRY[s]).find(Boolean) ?? types.map((s) => TYPE_INDUSTRY[s]).find(Boolean) ?? null,
      countryHint: "JP",
      sourceRef: `${BASE}/sites/${p.postID}/`,
    };
  }).filter(Boolean);
}

export function listing({ limit }) {
  return paged({
    name,
    limit,
    maxPages: 260,
    pageUrl: (n) => `${BASE}/api/toppage_v2?paged=${n}`,
    // fetchHtml for its robots.txt check; the endpoint answers JSON either way.
    load: async (url) => JSON.parse(await fetchHtml(url)),
    parse,
  });
}
