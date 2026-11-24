// Gallery adapters in the order discovery interleaves them. Each exports
// `name` and `listing({ limit })`, an async iterator of
// { url, name?, industryHint?, countryHint?, sourceRef }.
//
// Not yet adapted: The FWA (client-rendered), Land-book, Lapa Ninja, Web Design Inspiration,
// Saaspo and Maxibestof (403 behind a bot challenge), SiteInspire (403/429),
// CSS Reel (now a casino affiliate page), Unsection (lists sections, not sites;
// the site link is only on each section page),
// Supahero (hero sections, now folded into screensdesign.com), Made in Webflow and
// SaaSFrame (no outbound site links in the served HTML), CSSMania (links behind bit.ly),
// Web Guru Awards (winners page and site pages render client-side), bestcss.in
// (mostly agency and local-business submissions), Muzli (inspiration is articles and
// shots, not a site list), DesignMunk (no outbound site links), Pafolios (client-rendered),
// CSS Awards (cssawards.net, now a parked domain), UIJar (the domain now hosts an
// unrelated business), DesignRush and Web Design Museum (403 behind a bot challenge),
// Websitevice (small category pages of mixed quality, robots.txt asks a 10s crawl delay),
// Minimalissimo (product and interior design, not websites), Page Collective (app
// flows and screens, not sites), SaaS Websites (no outbound site links), GSAP showcase
// and Bento Grids (client-rendered), Call to Inspiration and Communication Arts
// Webpicks (client-rendered), Web Design Awards (webdesignawards.io, paid submissions
// from agencies and local businesses), Fonts In Use (robots.txt asks a 10s crawl
// delay), UI UX Showcase (mostly design resources and tools, not sites), Light Mode
// Design (now a shop), SaaS Interface (app screens), Super Creative (a studio site),
// Made on Tilda (no outbound site links), Portfolio Village (not a site gallery),
// Looks Like Good Design (creative work of every kind, not websites), Framer Websites
// (an agency site, not a gallery), One Page Mania (now redirects to an agency site),
// startups.gallery (a startup and jobs directory), Next.js showcase (a handful of sites),
// Design Inspiration (design-inspiration.net, industrial and product design, not
// websites), Readymag showcase (the page is gone), Shopify examples
// (a handful of stores), Tailwind CSS showcase (client-rendered), Three.js showcase
// (mostly WebGL demos, games and experiments, not sites), Sanity's showcase (robots.txt
// disallows /showcase), Strapi showcases (mostly small local businesses), Craft CMS
// showcase (now redirects to the home page, whose few links are agency case studies),
// ProcessWire sites directory, Readymag examples and Remix showcase (no site links in
// the served HTML), Hugo, Payload, Storyblok, DatoCMS, Directus and Svelte showcases (404),
// Prismic showcase and Ghost Explore (only a handful of sites in the served HTML),
// Site Builder Report inspiration (mostly small businesses, many affiliate links),
// Codrops inspiration roundups (403 behind a bot challenge), Webby Awards winners
// (client-rendered), Made with Vue.js, React and Laravel (mostly apps and side
// projects), Klim's In Use (mostly print),
// Cofolios and Bestfolios (client-rendered), Barba.js showcase (read from Firestore
// behind an encrypted client key), Wix Studio inspiration (no site links in the served
// HTML), Design Made in Germany (a design blog and agency directory, not a site gallery),
// Wagtail's own showcase (wagtail.org/showcase, a few case studies; Made with Wagtail is
// its site list), Design Inspiration (design-inspiration.net, product design, not websites),
// Drupal case studies (robots.txt asks a 10s crawl delay), Cargo examples and the Webflow,
// Builder.io, Concrete CMS and Contao showcases (404), Elementor and Bricks showcases (no
// site links in the served HTML), October CMS, Grav, Jamstack, Neos, TYPO3 and Umbraco
// showcases (404), S5-Style (its listings and RSS feed carry no outbound site links),
// 81-web.com (client-rendered), SANKOU! (mostly recruiting subpages of corporate sites),
// GDWEB and Webzooo (robots.txt disallows every crawler), Bookma! (now a reading app),
// The Whimsical Web (a small webring of personal pages), A Fresh Website and Good Cart
// (behind Vercel's bot checkpoint), Minimal Sites (dormant since about 2011), LP-web
// (campaign landing pages deep inside large corporate sites), Lately (interaction
// clips posted on X, not sites), design.fish and Inspiration Supply (no site links
// in the served HTML), Awwwards Developer Award and Sites of the Month (nearly every
// entry is already a Site of the Day), landingpage.fyi and CTA Examples (affiliate
// tool links and section clips, not a list of sites), Craftwork's website inspiration
// (mirrors Curated's entries and images), Saved, Webpo and Websites on Display (no site
// links in the served HTML), Straightline bookmark, RDLP's LP Archive and
// Inspirationde (403 behind a bot challenge), stunning.design, regards.design and
// Memorables (no site links in the served HTML), curateDB (a directory of design
// resources, not sites), Japan Web Design Gallery (robots.txt asks a 10s crawl
// delay), Rebrand Gallery (brand identities, not websites), Startup Inspire and
// CSS Luxury (403 behind a bot challenge), Design Spells (429), Framer Awards (about
// 25 winners a year), Best Designs On X (posts on X, not sites), delights.design and
// Inspiration Index (403 behind a bot challenge), save.design, Inspo MCP, swaggin and
// Step1's gallery (no site links in the served HTML), refs.gallery (behind Vercel's
// bot checkpoint), Deslove (mostly Dribbble and Behance shots, not sites), The Index
// (studio pages link to Instagram, not the studio's site) and Awesome Marketing
// Websites (only the featured site in the served HTML), Load More (robots.txt asks a 10s
// crawl delay), Exhibita (mirrors Awwwards' entries and links back to them), coolest.design
// (mostly UI components and experiments, few site links), Landdding (open submissions,
// many small businesses), Brutal Web (a Readymag page whose entries link to Are.na),
// movin.design (motion components and icons, not sites), Inspora (posts and creators,
// not sites), OKAY DEV (a community of articles and profiles), The Colophon (no site
// links in the served HTML), Prettyfolio (the domain now serves gambling spam), foliofolio
// (a parked domain), Visual Journal (brand identity projects linking to their designers),
// Web3Inspiration (32 sites, no new entries since January 2025), CreateToday examples
// (403 behind a bot challenge, mostly small businesses), Web Design Garden (many
// recruiting and campaign subpages of corporate sites) and Gendai Design (no new entries
// since August 2023), Best Web Gallery (bestwebgallery.com, no new entries since 2016),
// CSS Crème's showcase (behind Vercel's bot checkpoint), Uncommon Gallery (the domain
// now redirects to a parked lander) and Foxora Showcase (a registry of rebuild prompts, about 100 references),
// DTC Patterns (brand pages carry no outbound site links), Awwwesome (about 18 sites, ignores
// paging, no new entries since September 2025), Designeer's Recent Design (403 behind a bot
// challenge), aiwebsites.design (a domain for sale) and saasy.design (a parked lander),
// CSS Remix (now a page of CSS links), Unicorn Studio's showcase (client-rendered),
// The Inspiration (design articles of every kind, not websites), PagesThatPrint (indie
// SaaS submissions, its pages are mostly launch-directory badges), CTA Gallery (CTA
// sections, many of them templates) and steep.design (no site links in the served HTML),
// Supercharge Design (a UI course whose site list is mostly corporate home pages),
// Interface Index (B2B interface elements, not sites), WeLoveWP and dbcut (403 behind a
// bot challenge), Websites That Convert (no site links in the served HTML),
// Commerce Cream (the domain no longer resolves), SITEJOY (a domain for sale),
// oolala.space (client-rendered, a handful of sites in the served HTML), siteu.io
// (client-rendered, no sitemap), BuildinFramer (the domain does not resolve),
// posts.design (no site links in the served HTML), Social Proof Examples (video
// clips of testimonials, not sites), UI Bits (a newsletter), PFolios (client-rendered,
// "available soon"), Speedlify's Eleventy community list (mostly developer blogs),
// Coherent Design (app UI screens, not sites), Web Design Pub (the domain does not
// resolve), WebCurate (a directory of useful sites and tools, not a design gallery),
// Inspiration UI (no new entries in years), HyperFramer (Framer templates), Calltoidea
// (UI elements, not sites), LandingPicks (client-rendered), Hoverstate (its TLS handshake
// fails), Astonishing Awards (client-rendered), TopDesignKing and WebsURL (mostly paid
// submissions from small businesses and SEO tools), Soreiine! (no site links in the
// served HTML), URAGAWA (401), Modulesss (sections of mostly small local business and
// recruiting sites, no new entries since December 2024), GOOD PORTFOLIO (30 of its 223
// portfolios in the served HTML, detail pages carry several unlabeled links), cms design
// (mostly small local companies and recruiting pages), Zzrock (no new entries since
// 2019), Shopify Hydrogen showcase (about 15 stores), webdesign-journal.de (no site links
// in the served HTML), archives.design (print design archives, not websites),
// Stock (stock.pulpxstyle.com), ウェブコレ and 週刊ウェブデザイン (403 behind a bot
// challenge), Mag Collection (404), マネるデザイン研究所, Studio Showcase and Viewport UI
// (no site links in the served HTML), trending.design (a domain for sale),
// Design Library (design-library.jp), web-mihon, W-Finder, Daily Web Design and
// Webstudio's showcase (403 behind a bot challenge), Good Design Web (520), Webframe
// (archived), Minimal Exhibit (a WordPress error page), pages.xyz (a parked lander),
// NavNav+ (the domain now serves gambling spam), The Best Designs, Web Design
// Ranked and webdesignsample.net (the domains do not respond), Web Anatomy (no site
// links in the served HTML), MyCodelessWebsite (robots.txt asks a 50s crawl delay),
// HTML5 Gallery (now casino spam), CartFrenzy and SaaS CSS (no new entries in years),
// StyleTheWeb (mostly small local businesses), Sites Gallery (a design blog that
// links to other galleries), PageCrush, GalleryRush, The CSS Gallery List and Design
// Everywhere (403 behind a bot challenge), Foleo (no site links in the served HTML),
// UI Sections (sections only, no site links), Tau Magazine (no new entries since 2020),
// sps collection (no new entries since 2023), web-selection.com (a domain for sale),
// Stash (a directory of about 190 tools, foundries and studios), ListOfWebsites (an
// SEO directory whose counts contradict themselves), Browse.Cool and wwwtf.site (no site
// links in the served HTML), Insposite (a handful of sites in the served HTML)
// and Motion Sites (403 behind a bot challenge), Kage (mostly Product Hunt launches
// and app screens), Landing Pages Explained (copywriting teardowns of indie products),
// collected.li (eight random sites a visit), ARTNOC and .SG_BOOKMARK (the domains do
// not respond), webportfolios.dev (402), Inspirectory and mkdir.directory (directories
// of galleries, not sites), LDS Library (Dribbble and Behance shots) and
// personalsit.es (mostly developer blogs), Rick Creates (rickcreates.com, mirrors FWA
// and Awwwards entries) and Adfolio (behind Vercel's bot checkpoint), Global Web Design
// Awards (mirrors Awwwards' entries and logos), Web Dev Awards, CSS Awards (cssawards.org)
// and WD Awards (403 behind a bot challenge), Website Design Awards (read from Supabase
// client-side), Designs Creme (no site links in the served HTML) and dailyweb.design
// (a parked lander), MegaMegaTypeType (links to single typeface pages, not foundry
// sites), Vev's showcase (404), Eyecandy (403 behind a bot challenge),
// studiodirectory.co (a GoDaddy placeholder), Mega Awwards (mostly paid submissions
// from small local businesses), umanmade, on.design and Scrolltide (shots, templates
// and prompts, not sites), Me, But Online (no new entries since May 2023), UI Coach
// (402), The Vellum (a handful of sample projects) and Personal Site Gallery (tens of
// thousands of mostly developer blogs), Photo Web Designs (a web design agency for
// photographers, not a gallery) and Aura++ (a startup launch directory).
import * as awwwards from "./awwwards.js";
import * as cssdesignawards from "./cssdesignawards.js";
import * as refero from "./refero.js";
import * as onepagelove from "./onepagelove.js";
import * as curated from "./curated.js";
import * as httpster from "./httpster.js";
import * as cssnectar from "./cssnectar.js";
import * as minimalGallery from "./minimal-gallery.js";
import * as darkmodedesign from "./darkmodedesign.js";
import * as siteofsites from "./siteofsites.js";
import * as admiretheweb from "./admiretheweb.js";
import * as bestwebsitegallery from "./bestwebsitegallery.js";
import * as typewolf from "./typewolf.js";
import * as hoverstates from "./hoverstates.js";
import * as siiimple from "./siiimple.js";
import * as landinglove from "./landinglove.js";
import * as ecommdesign from "./ecommdesign.js";
import * as brutalistwebsites from "./brutalistwebsites.js";
import * as footerdesign from "./footerdesign.js";
import * as mindsparklemag from "./mindsparklemag.js";
import * as deadsimplesites from "./deadsimplesites.js";
import * as landingfolio from "./landingfolio.js";
import * as csswinner from "./csswinner.js";
import * as navbargallery from "./navbargallery.js";
import * as designnominees from "./designnominees.js";
import * as semplice from "./semplice.js";
import * as webdesignclip from "./webdesignclip.js";
import * as csslight from "./csslight.js";
import * as details from "./details.js";
import * as saaspages from "./saaspages.js";
import * as saaslandingpage from "./saaslandingpage.js";
import * as sitesee from "./sitesee.js";
import * as landinggallery from "./landinggallery.js";
import * as cssline from "./cssline.js";
import * as orpetron from "./orpetron.js";
import * as unmatchedstyle from "./unmatchedstyle.js";
import * as a1gallery from "./a1gallery.js";
import * as seesaw from "./seesaw.js";
import * as landingsdev from "./landingsdev.js";
import * as pricingpages from "./pricingpages.js";
import * as typio from "./typio.js";
import * as fourohfours from "./fourohfours.js";
import * as killerportfolio from "./killerportfolio.js";
import * as webinspoo from "./webinspoo.js";
import * as astro from "./astro.js";
import * as gatsby from "./gatsby.js";
import * as nuxt from "./nuxt.js";
import * as lenis from "./lenis.js";
import * as kirby from "./kirby.js";
import * as wordpress from "./wordpress.js";
import * as statamic from "./statamic.js";
import * as muuuuu from "./muuuuu.js";
import * as awwwardshonorable from "./awwwardshonorable.js";
import * as wallofportfolios from "./wallofportfolios.js";
import * as osmo from "./osmo.js";
import * as wagtail from "./wagtail.js";
import * as darkdesign from "./darkdesign.js";
import * as io3000 from "./io3000.js";
import * as responsivejp from "./responsivejp.js";
import * as ikesai from "./ikesai.js";
import * as gallereee from "./gallereee.js";
import * as mosaic from "./mosaic.js";
import * as saasui from "./saasui.js";
import * as cursorup from "./cursorup.js";
import * as oneguu from "./1guu.js";
import * as desengs from "./desengs.js";
import * as wpgallery from "./wpgallery.js";
import * as storefolio from "./storefolio.js";
import * as curategallery from "./curategallery.js";
import * as browsingmode from "./browsingmode.js";
import * as herogallery from "./herogallery.js";
import * as threedwebsites from "./threedwebsites.js";
import * as mesh3d from "./mesh3d.js";
import * as klikkentheke from "./klikkentheke.js";
import * as cryptodesignclub from "./cryptodesignclub.js";
import * as choooodoii from "./choooodoii.js";
import * as shopsiteawards from "./shopsiteawards.js";
import * as designforb2b from "./designforb2b.js";
import * as uidesignstudio from "./uidesignstudio.js";
import * as finpantheon from "./finpantheon.js";
import * as landingpagegallery from "./landingpagegallery.js";
import * as justadesignlist from "./justadesignlist.js";
import * as glance from "./glance.js";
import * as tinyblocks from "./tinyblocks.js";
import * as lowww from "./lowww.js";
import * as perfolios from "./perfolios.js";
import * as ogimagegallery from "./ogimagegallery.js";
import * as designdetails from "./designdetails.js";
import * as inspolanding from "./inspolanding.js";
import * as dragdropship from "./dragdropship.js";
import * as sectionswtf from "./sectionswtf.js";
import * as topcssgallery from "./topcssgallery.js";
import * as brik from "./brik.js";
import * as goodwebdesign from "./goodwebdesign.js";
import * as nook from "./nook.js";
import * as brilliantdesign from "./brilliantdesign.js";
import * as designnokoto from "./designnokoto.js";
import * as koreawebdesign from "./koreawebdesign.js";
import * as reeoo from "./reeoo.js";
import * as arche from "./arche.js";
import * as lowwwcarbon from "./lowwwcarbon.js";
import * as framergallery from "./framergallery.js";
import * as bestsaaswebdesigns from "./bestsaaswebdesigns.js";
import * as recent from "./recent.js";
import * as storefront from "./storefront.js";
import * as palate from "./palate.js";
import * as uxportfolios from "./uxportfolios.js";
import * as peekpaper from "./peekpaper.js";
import * as somewhatcreative from "./somewhatcreative.js";
import * as animorio from "./animorio.js";
import * as brutalistgarden from "./brutalistgarden.js";
import * as typelol from "./typelol.js";
import * as typefoundrydirectory from "./typefoundrydirectory.js";
import * as mabtu from "./mabtu.js";
import * as brianlovin from "./brianlovin.js";
import * as catalog from "./catalog.js";
import * as storeinspo from "./storeinspo.js";

export const GALLERIES = [awwwards, cssdesignawards, refero, onepagelove, curated, httpster, cssnectar, minimalGallery, darkmodedesign, siteofsites, admiretheweb, bestwebsitegallery, typewolf, hoverstates, siiimple, landinglove, ecommdesign, brutalistwebsites, footerdesign, mindsparklemag, deadsimplesites, landingfolio, csswinner, navbargallery, designnominees, semplice, webdesignclip, csslight, details, saaspages, saaslandingpage, sitesee, landinggallery, cssline, orpetron, unmatchedstyle, a1gallery, seesaw, landingsdev, pricingpages, typio, fourohfours, killerportfolio, webinspoo, astro, gatsby, nuxt, lenis, kirby, wordpress, statamic, muuuuu, awwwardshonorable, wallofportfolios, osmo, wagtail, darkdesign, io3000, responsivejp, ikesai, gallereee, mosaic, saasui, cursorup, oneguu, desengs, wpgallery, storefolio, curategallery, browsingmode, herogallery, threedwebsites, mesh3d, klikkentheke, cryptodesignclub, choooodoii, shopsiteawards, designforb2b, uidesignstudio, finpantheon, landingpagegallery, justadesignlist, glance, tinyblocks, lowww, perfolios, ogimagegallery, designdetails, inspolanding, dragdropship, sectionswtf, topcssgallery, brik, goodwebdesign, nook, brilliantdesign, designnokoto, koreawebdesign, reeoo, arche, lowwwcarbon, framergallery, bestsaaswebdesigns, recent, storefront, palate, uxportfolios, peekpaper, somewhatcreative, animorio, brutalistgarden, typelol, typefoundrydirectory, mabtu, brianlovin, catalog, storeinspo];
