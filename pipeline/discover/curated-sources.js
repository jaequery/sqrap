// Discovery sources whose sites a human picked one by one for their design: a
// jury, an editor or a curator chose each site because it is well designed. The
// judge approves sites from these sources at the lower SQRAP_MIN_QUALITY_CURATED
// bar (pipeline/judge/index.js), since its quality score mostly second-guesses
// that human's pick; every other source keeps SQRAP_MIN_QUALITY.
//
// The rule, per adapter in ./galleries (its `name`, which is sites.source):
// - in: design award winners (juried awards, Sites of the Day, Honorable
//   Mentions) and galleries whose editors hand-pick each site for its design;
// - out: every-submission lists (the nominees adapters), platform and library
//   showcases (BigCommerce, WooCommerce, WordPress, Astro, Framer, Webflow
//   partners...), libraries of sections, screens or components picked for one
//   part of the page (hero, CTA, footer, pricing, 404, OG image), directories
//   of studios, foundries or people (picked for the practice, not the site),
//   lists picked on another axis (low carbon, desktop OS look, employer),
//   broad web-marketing awards (W3, Communicator, WebAwards, Horizon), the
//   accelerators, search and manual seeds, and galleries whose selection is not
//   stated. Start narrow: an adapter not listed here keeps the normal bar.
export const CURATED_SOURCES = new Set([
  // Juried design awards and Sites of the Day
  "awwwards", "awwwards-honorable", "cssdesignawards", "csswinner", "designnominees",
  "topcssgallery", "bestwebsitegallery", "typewolf", "koreawebdesign",
  "commarts", "europeandesign", "germandesignaward", "germanbrandaward", "gooddesignaustralia",
  "appliedarts", "visuelt", "lovieawards", "tagline", "altinorumcek", "azevhonlapja",
  // Galleries hand-picked for design
  "curated", "darkmodedesign", "darkdesign", "brutalistwebsites", "recent", "mosaic",
  "48gallery", "aidesigner", "allwebsites", "arche", "brianlovin", "browsingmode",
  "creativetable", "curategallery", "delightful", "desengs", "designatlas", "designdetails",
  "gooddesigngallery", "hallointer", "inspolanding", "mabtu", "madeonweb", "norrly",
  "palate", "peekpaper", "refto", "uidesignstudio", "theresponsive", "webavantgardes",
  "somewhatcreative", "webdesignerdepot", "webdesigninspiration", "studioeditorspick",
  "bestsaaswebdesigns", "designforb2b", "finpantheon", "cryptodesignclub", "mesh3d", "3dwebsites",
  // Online stores hand-picked for design
  "dtcgallery", "ecomgallery", "headlessclub", "shopsiteawards", "storefolio", "storefront",
  "storeinspo", "tinyblocks", "wpgallery",
  // Portfolios hand-picked for design
  "bestfolios", "pafolios", "perfolios", "portfolioproject", "uxportfolios", "foliosgallery",
  "gallereee", "killerportfolio", "designdobrasil", "awesomeportfolios", "designerportfolios",
  // Japanese galleries whose editors pick each site
  "muuuuu", "io3000", "responsivejp", "webdesignclip", "sankou", "s5style", "kasou",
  "soreiine", "choooodoii", "brilliantdesign", "wowoworks", "81web",
]);

export const isCuratedSource = (source) => CURATED_SOURCES.has(source);
