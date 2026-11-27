// Gallery adapters in the order discovery interleaves them (the last three,
// from ./accelerators.js, read accelerator portfolios rather than galleries). Each exports
// `name` and `listing({ limit })`, an async iterator of
// { url, name?, industryHint?, countryHint?, sourceRef }.
//
// Not yet adapted: The FWA (client-rendered), Land-book, Lapa Ninja, Web Design Inspiration,
// Saaspo and Maxibestof (403 behind a bot challenge), SiteInspire (403/429),
// CSS Reel (now a casino affiliate page), Unsection (lists sections, not sites;
// the site link is only on each section page),
// Supahero (hero sections, now folded into screensdesign.com), Made in Webflow
// (no outbound site links in the served HTML), CSSMania (links behind bit.ly),
// Web Guru Awards (mostly small businesses, tools and personal pages), bestcss.in
// (mostly agency and local-business submissions), Muzli (inspiration is articles and
// shots, not a site list), DesignMunk (no outbound site links),
// CSS Awards (cssawards.net, now a parked domain), UIJar (the domain now hosts an
// unrelated business), DesignRush and Web Design Museum (403 behind a bot challenge),
// Websitevice (small category pages of mixed quality, robots.txt asks a 10s crawl delay),
// Minimalissimo (product and interior design, not websites), Page Collective (app
// flows and screens, not sites), SaaS Websites (no outbound site links), GSAP showcase
// (a handful of sites in the served HTML), Call to Inspiration and Communication Arts
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
// (a handful of stores), Three.js showcase
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
// Barba.js showcase (read from Firestore
// behind an encrypted client key), Wix Studio inspiration (no site links in the served
// HTML), Design Made in Germany (a design blog and agency directory, not a site gallery),
// Wagtail's own showcase (wagtail.org/showcase, a few case studies; Made with Wagtail is
// its site list), Design Inspiration (design-inspiration.net, product design, not websites),
// Drupal case studies (robots.txt asks a 10s crawl delay), Cargo examples and the Webflow,
// Builder.io, Concrete CMS and Contao showcases (404), Elementor and Bricks showcases (no
// site links in the served HTML), October CMS, Grav, Jamstack, Neos, TYPO3 and Umbraco
// showcases (404), 81-web.com (client-rendered), GDWEB and Webzooo (robots.txt disallows every crawler), Bookma! (now a reading app),
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
// SaaS submissions, its pages are mostly launch-directory badges) and steep.design (no
// site links in the served HTML); CTA Gallery, passed over then for its templates, is
// now adapted (ctagallery.js),
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
// photographers, not a gallery), Aura++ (a startup launch directory), Headers Club
// (behind a Vercel login), before.click and abtest.design (App Store screenshots and
// A/B test results, not sites), Clonify (a Framer template library), Repaint (website
// examples from small local businesses), Selected Screens and The UI Index
// (their robots.txt bars AI crawlers), WPMade (mostly small local businesses),
// curated.cool (a dormant link list), Kombai Gallery (generated UI designs, not
// sites), Musterlab (deployment disabled), Inspoweb and Pure Sites (behind Vercel's bot
// checkpoint), styleguide.fyi (a coding style guide), Motion Folios (client-rendered),
// Leadership Folios (about 40 design leaders' sites, mostly writing), Webfolios
// (about 60 portfolios, nothing new since January 2025), Parts. and umeboshi (mostly
// Japanese corporate and small local business sites), Startup Web Designs (the domain
// now serves gambling spam), D1S1 (behind Vercel's bot checkpoint), Shops.Gallery (an
// alphabetical archive of about 3,500 ordinary Shopify stores), WhatPixel (roundups of
// small local business sites), H1 Gallery (startup headlines, not site design),
// Inspireca, Chamjo and UI Land (app screens and UI resources, not sites),
// website-inspiration.com (about 250 sites, mostly small local businesses), SQSP Weekly
// and Wix Studio inspiration (no site links in the served HTML), Best of Swiss Web
// (client-rendered), Landify and Framify (UI kits, not galleries), saaslandings.com (a
// parked lander), UX Collective (uxcollective.io, nine sites), Super, Feather and
// Typedream showcases (mostly Notion-built pages) and Dutch Digital Design (a single
// welcome post), Single-Serving Sites (its robots.txt bars AI crawlers), VICE Awards
// (website-award.com, about 50 Site of the Day winners, mostly personal portfolios),
// Case Study Club (a newsletter of articles), Design Directory (design tools and
// schools, not sites), Collecta (a bookmarking app) and Curation of Curations (a
// directory of galleries and blogs, not sites), Red Dot (its robots.txt bars AI
// crawlers), iF Design Award and dotCOMM Awards (403 behind a bot challenge), The
// Davey Awards (its Gold website winners are mostly small local businesses and law
// offices), Vega Digital Awards (its robots.txt bars AI crawlers), UX Design Awards
// (product and service UX, not websites), Indigo Design Award (its robots.txt disallows
// every crawler), Interactive Media Awards (the domain does not respond), Clio Awards
// (robots.txt asks a 10s crawl delay), D&AD (robots.txt disallows the /search/ its
// archive is read from), The One Show and ADC Awards (oneclub.org's robots.txt
// disallows every crawler), Best Design Awards (bestawards.co.nz, winners' pages
// carry no site links), Deutscher Digital Award (mostly ad campaigns, not sites),
// Swiss Typefaces' and Pangram Pangram's in-use pages (mostly print), Information is
// Beautiful Awards (data visualisations, mostly articles deep inside news sites), A'
// Design Award (winner pages carry no site links), Golden Pin Design Award (mostly
// products and print, links go to designers' Behance pages), ADC Europe (projects
// link only the entrant agency's site), The FWA (winner data loads from /api, which
// robots.txt disallows; the winners feed carries no site links), i-Award Korea
// (robots.txt bars AI crawlers), Danish Digital Award (mostly apps and marketing
// results), Australian Web Awards, AGDA Awards and Netty Awards (robots.txt asks a
// 10s crawl delay), Svenska Designpriset (client-rendered), Hydrogen showcase (about
// 15 stores), Core77 Design Awards (robots.txt bars AI crawlers), ADC Deutschland (its
// archive is news posts), New York Festivals and Kyoorius (their robots.txt bars AI
// crawlers), WebTop100 (about six websites a year, judged on UX and marketing), Premios
// CLAP (winner pages link only the designer, ended in 2025), Dutch Design Awards (design
// of every kind, few websites), Vuoden Huiput (digital winners link case films and
// prototypes, about four a year), Good Design Award Japan (client-rendered, mostly
// products, 429), Laus (project pages link only the entrant studio), Tina, Qwik and
// Cosmic showcases (mostly developer side projects), Netko (its project pages answer 500,
// and its winners list carries no site links), Golden Site (goldensite.ru, client-rendered
// behind its API's credentials), Workspace Digital Awards (nominees are agencies, linked
// through /redirect/, which robots.txt disallows), Spider Awards (two website winners a
// year, no site links), Icelandic Web Awards (svef.is, no winners list), Zlatý středník
// (corporate communications, not websites), Guldägget, Loeries and Kuldmuna (advertising
// campaigns; archive entries carry no site links), Dutch Interactive Awards (its winners
// page is gone), Jekyll showcase (about 50 mostly developer sites), Squarespace examples
// (no site links in the served HTML), Design Nominees' and CSS Light's full submission
// lists (mostly small agencies and local businesses, one network), MUSE Design Awards and
// Are.na channels (robots.txt bars AI crawlers), Web Design File (no new entries since
// about 2017), Rating Runeta (an agency ranking whose paging robots.txt disallows),
// CSS Design Awards' nominees list (the same entries as its website gallery, which
// is already adapted and reaches further back), Stock Design (mostly law, dental and
// salon sites), AGT smartphone design gallery and matome (mostly Japanese corporate
// and small local business sites), PixiJS showcase (mostly games and demos), Medusa
// and PrestaShop showcases (no site links in the served HTML), Webグランプリ (Web Grand
// Prix, award.dmi.jaa.or.jp: about 240 winners since 2013, more than half campaign and
// recruiting pages deep inside large corporate sites), Gulltaggen (a handful of websites a
// year among advertising campaigns), the in-use pages of ABC Dinamo, Grilli Type, Displaay,
// Commercial Type, Colophon, F37, Production Type and Optimo (404), The FWA's
// new sitemap (only its ~38 latest /w/ winners, whose pages render from /api) and its
// legacy archive (legacy.thefwa.com, which hides every outbound link on purpose),
// the Plasmic, Keystatic, GraphCommerce, TresJS and Threlte showcases (about 30, 10
// and 25 sites, mixed with demos and small retailers; mostly demos), the Vev showcase
// (loads again, but no site links in the served HTML), Component Gallery (design
// system docs, mostly subdomains of sites already stored) and ui-feed (live
// components, not sites), Prémios Lusos (the domain now serves a Chinese video site),
// Web Excellence Awards (a parked domain) and Digital Design Awards (now redirects to
// the World Business Awards), Epica Awards, Graphis, Type Directors Club and The Drum
// Awards (403 behind a bot challenge), the Motion and Rive showcases and the Typotheque and
// Fontwerk in-use pages (404), Sharp Type's in-use page (429), and HKDA Global Design
// Awards, CCA Venus, Annual Multimedia, Joseph Binder Award and Creative Circle (the
// domains do not respond), the Shopify Theme Store's "Stores using this theme" (up to
// five stores a theme, mostly small ordinary shops), ADCC Awards, Golden Drum and
// Dexigner (robots.txt asks a 60s, 30s and 60s crawl delay), Love the Work (Cannes
// Lions' archive; robots.txt bars AI crawlers), It's Nice That (articles about creative
// work of every kind, not a site list), Brand Impact Awards (branding projects reported
// in articles) and lookup.design and Landingly (client-rendered), GDUSA's American Web
// Design Awards (no winners since 2021, its gallery behind Vercel's bot checkpoint),
// Museum of the Human Web (computing artifacts, not sites), Liquid Glass Design (UI
// shots and prompts) and Pixelfika (client-rendered), Zlatý klinec (Slovak advertising
// awards; its archive lists campaigns, not sites), changelog.gallery (changelog posts),
// sites.gallery (links to other galleries and shot sites, not to sites), scroll.gallery
// (design resources), startup.gallery (no site links in the served HTML), Prix Numix
// (Quebec's digital creativity awards: installations, podcasts, series and XR, few
// websites), Shaheer Malik's examples (a freelancer's lists of about eight famous
// sites each), Internetics, Ermis Awards and Adwards (advertising awards whose
// winners are campaigns, videos and social posts), Lápiz de Acero (its few website
// winners have no link to the site), SND Best of Digital Design (results in Airtable),
// Schick Toikka in use (client-rendered), the Babylon.js community page (demos),
// divbyzero's SaaS Examples (app screens and emails, not sites), Made with Lovable
// (vibe-coded side projects), BX Museum (brand stories, no site links), Identity
// Designed (branding case studies), the IAB SA Bookmark Awards (winners only in PDFs),
// Awwwards collections (drawn from the same jury submissions Awwwards Nominees reads),
// Media Queries (mediaqueri.es, the domain now holds an unrelated placeholder), Viewport
// Gallery (its API answers a database error), Best Product Sites (times out), Big
// Cartel's examples (about a dozen shops), Top Design King (mostly AI tools and utility
// sites) and the galleries listed on Web Gallery Submission that no longer resolve
// (CSS Based, CSS Loggia, CSS Websites NL, dsgnlv, Strange Fruits), Studio Showcase
// (about 2,450 reviewed submissions, mostly small local businesses and offices; its
// editors' monthly picks are studioeditorspick.js), Studio's customer stories (about 60
// corporate case studies), the ICONIC AWARDS (architecture and interiors), ICAD
// (robots.txt asks a 10s crawl delay), Grafika (its archive bars AI crawlers and
// answers 403), Flat Design (fltdsgn.com, one post linked from its served home page)
// and Hoverstate (the domain does not resolve), Bulma's expo (a few dozen framework
// sites), The Inspiration Grid (its web design category answers 404), Web Creme
// (redirects to CSS Mania), CSS Elite (redirects to the GraphCommerce gallery), the
// .eu Web Awards (about 25 finalists a year, judged on the .eu domain rather than
// design) and The Best Designs, CSS Drive, CSS Flavor and Agency Inspired (no longer
// resolve), 10 Best Design (a ranking of agencies, not sites), eCommerce Showcase
// (an archived copy from 2019), The Drum Roses Awards (advertising campaigns, The Drum's
// archive), Styleboost (down for maintenance), Best Design Korea (design of every kind,
// few websites), iiimg and dbdic (the domains answer 503 or do not respond) and 68design
// (behind a captcha), Go Good Site (the domain does not respond), Uneed (a launch
// directory of tools), Screenlane (redirects to Page Flows, 403), Hyperpixel (the domain
// now redirects to an unrelated site), Designspiration (403 behind a bot challenge) and
// Boring Websites (three site links in the served HTML), Pixlpin (a Cloudflare challenge,
// and app and UI screenshots), Detail (detail.design, small interface decisions), Details
// Matter (micro-interactions on one Framer page), Viewport UI (UI shots from designers on
// X), Varchive (AI news), CSS Gallery (cssrefresh.com, 14 entries, most of them google.com,
// yahoo.com and placeholders), Modulesss (parts cut from sites), the Joomla Showcase
// (community-submitted Joomla sites, not picked for design), Web Design Inspiration
// (webdesign-inspiration.com, 403 behind a bot challenge, its sitemap too), TCD Museum
// (sites built on one vendor's WordPress themes, mostly small Japanese businesses) and the
// Dezeen Awards (architecture, interiors and products, no website category). Abduzeedo and
// the Scottish Design Awards (robots.txt bars AI crawlers), The Design Inspiration (its
// websites category stops in 2018 with empty post bodies, and the blog now carries pharmacy
// spam), Speckyboy (scattered listicles, not a series), the BIMA Awards (agencies and
// campaigns announced in news posts) and the Docusaurus showcase (documentation sites). The Needle Engine
// showcase (now redirects to the home page), Dark Mode List (apps and tools with a dark mode,
// not picked for design), Webby Design (an agency site), Web Design Rankings (an agency
// directory) and Mass-Driver's in-use page (404). getdesign.ai (about 45 sites, mostly
// reposted from Recent and X) and 4db (no new entries since 2014). Tessory (its about
// 1,000 websites mirror Awwwards, Hover States, Recent and Codrops, all read already).
// Bootstrap Expo (about 10 sites, no new entries since 2019), Made with Angular
// (mostly corporate apps, not picked for design), the Aceternity UI and Chakra UI
// showcases (indie AI tools and product apps built on the library), Brands in Motion
// (motion branding projects; its robots.txt bars AI crawlers), Identik (branding
// case studies), UI Garage (closed) and Nicelydone (app screens behind an account).
// Hermes Creative Awards (winners load client-side, mostly marketing collateral), the
// Webflow Awards (about 30 winners and finalists a year, mixed with agencies, partners
// and people), Made in Webflow's API (community cloneables and templates), Made with
// Svelte (mostly apps and side projects), Best CSS Gallery (now casino spam), Designflavr
// (a link page to other galleries), CSS Pick and The Gallery (empty placeholders) and
// unseen.design (a parked lander). SiteInspire's RSS feed answers, but its items link
// only to detail pages behind Vercel's bot checkpoint, and robots.txt bars AI crawlers.
import * as awwwards from "./awwwards.js";
import { techstars, finc, speedrun } from "./accelerators.js";
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
import * as awwwardsnominees from "./awwwardsnominees.js";
import * as csswinnernominees from "./csswinnernominees.js";
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
import * as uidiscovery from "./uidiscovery.js";
import * as uisections from "./uisections.js";
import * as designatlas from "./designatlas.js";
import * as norrly from "./norrly.js";
import * as studioarchives from "./studioarchives.js";
import * as foliosgallery from "./foliosgallery.js";
import * as ecomgallery from "./ecomgallery.js";
import * as purelanding from "./purelanding.js";
import * as madeonweb from "./madeonweb.js";
import * as lovieawards from "./lovieawards.js";
import * as w3award from "./w3award.js";
import * as communicatorawards from "./communicatorawards.js";
import * as horizoninteractive from "./horizoninteractive.js";
import * as webaward from "./webaward.js";
import * as europeandesign from "./europeandesign.js";
import * as germandesignaward from "./germandesignaward.js";
import * as germanbrandaward from "./germanbrandaward.js";
import * as commarts from "./commarts.js";
import * as gooddesignaustralia from "./gooddesignaustralia.js";
import * as visuelt from "./visuelt.js";
import * as appliedarts from "./appliedarts.js";
import * as tagline from "./tagline.js";
import * as altinorumcek from "./altinorumcek.js";
import * as azevhonlapja from "./azevhonlapja.js";
import * as bigcommerce from "./bigcommerce.js";
import * as woocommerce from "./woocommerce.js";
import * as dtcgallery from "./dtcgallery.js";
import * as flatinspire from "./flatinspire.js";
import * as longlist from "./longlist.js";
import * as bestagencysites from "./bestagencysites.js";
import * as studioeditorspick from "./studioeditorspick.js";
import * as kasou from "./kasou.js";
import * as webdesigninspiration from "./webdesigninspiration.js";
import * as mooistewebsites from "./mooistewebsites.js";
import * as soreiine from "./soreiine.js";
import * as webdesignerdepot from "./webdesignerdepot.js";
import * as s5style from "./s5style.js";
import * as pafolios from "./pafolios.js";
import * as bestfolios from "./bestfolios.js";
import * as cofolios from "./cofolios.js";
import * as fountn from "./fountn.js";
import * as bentogrids from "./bentogrids.js";
import * as delightful from "./delightful.js";
import * as gooddesigngallery from "./gooddesigngallery.js";
import * as swup from "./swup.js";
// Also checked and not adapted: Motion Sites (now AI website prompts and templates, not
// sites), Memorables (its web entries link to the post on X, not the site), Stack Sorted
// (about 100 sites sorted by element, half of them CodePen demos), HTML Inspiration
// (about 40 posts, mostly well-known SaaS home pages) and gallery.jessyin.world
// (creative work of every kind, not websites).
import * as saasframe from "./saasframe.js";
// Also checked and not adapted: Made With Astro (madewithastro.co, mostly small local
// businesses and test pages), Flowing Page (the domain does not resolve), and Sombra,
// swiped., What Ships and GreatStuff.fyi (a gradient tool, a design content feed,
// launch videos from X and a bookmark list, not site galleries).
import * as portfolioproject from "./portfolioproject.js";
// Also checked and not adapted: LP advance (site-advance.info, campaign landing pages deep
// inside corporate sites such as bank app and snack campaign pages), Real Estate Design
// Gallery (re-designgallery.com, condominium sales sites, nothing new since 2021) and
// Selected Site (selected.site, now a link-in-bio builder's promo page for Mac apps).
import * as wowoworks from "./wowoworks.js";
// Also checked and not adapted: Best Restaurant Websites (bestrestaurantwebsites.net, serves
// nothing) and lovely ui (lovelyui.com, UI snippets, not site galleries).
import * as cmsdesign from "./cmsdesign.js";
// Also checked and not adapted: WowCSS, Cart Craze, Folio Focus and CSS Bag (no new
// entries in years), CSS Showcases and layout.gallery (placeholder pages), Call to
// Inspiration (its sitemap lists UI component categories, not sites) and the
// curtains.js showcase (a handful of sites).
import * as awwwardsdirectory from "./awwwardsdirectory.js";
// Also checked and not adapted: Framer Experts (about 100 partners in the served HTML,
// mostly small marketing agencies), TinaCMS showcase (about 20 sites), designsystems.surf
// (design-system docs), Trend List (graphic design images, not sites), Webframe (archived),
// Webstar Festival (the domain now hosts an article farm), Premio iBest and Křišťálová Lupa
// (popularity awards for brands and services, not design) and webawards.ie (parked).
// Also checked and not adapted: Websites That Win (a consultant's site, not a gallery),
// nicesites.co (an agency site), Trove and Reference (moodboard apps) and Spotted in Prod
// (iOS app details).
import * as webflowenterprise from "./webflowenterprise.js";
import * as designdobrasil from "./designdobrasil.js";
import * as fortyeightgallery from "./48gallery.js";
import * as allwebsites from "./allwebsites.js";
import * as aidesigner from "./aidesigner.js";
import * as hallointer from "./hallointer.js";
import * as theindex from "./theindex.js";
import * as theresponsive from "./theresponsive.js";
import * as tailwind from "./tailwind.js";
import * as creativetable from "./creativetable.js";
import * as webavantgardes from "./webavantgardes.js";
import * as refto from "./refto.js";
import * as awesomeportfolios from "./awesomeportfolios.js";
import * as ctagallery from "./ctagallery.js";
import * as pagedone from "./pagedone.js";
import * as portfolioideas from "./portfolioideas.js";
import * as webdesktops from "./webdesktops.js";
import * as headlessclub from "./headlessclub.js";
import * as designerportfolios from "./designerportfolios.js";
import * as sankou from "./sankou.js";
// Also checked and not adapted: UIZZE, Gummble and Flownato (app screens and flows, not
// websites), gallery.design (a kitchen showroom) and webdesignawards.net (a landing page
// for the A' Design Award, already checked).
// Also checked and not adapted: Flowradar's Webflow inspiration (about 85 sites behind
// its own link.flowradar.com redirects), Flowout's "best Webflow websites" (no site links
// in the served HTML) and Hoverstate (hoverstate.design still does not resolve).
// Also checked and not adapted: URAGAWA (still 401; its new uragawa.work domain redirects
// to the old address), WebAnatomy's "best landing pages" (an SEO agency's conversion
// scores, no outbound site links), Scaling DevTools' landing page directory (robots.txt
// bars AI crawlers), ThemesMotion's Best Sites (a template shop, client-rendered),
// awesome-web-prompts (AI prompts, not sites) and awwweasome-websites (about 100 links,
// mostly reposted from other galleries with their ?ref= tags, last added to in March
// 2025). pixelvault.design now belongs to a Tennessee web design agency.
// Also checked and not adapted: SiteThis (its robots.txt bars AI crawlers), Web Awards UA
// (webawards.com.ua, a national contest of entrant-submitted sites in industry
// nominations, mostly local companies and shops), webdesign.org's Site of the Day (its
// archive pages are empty), Readymag's portfolio page (images only, no site links), the
// creative-portfolios GitHub list (iRaul/creative-portfolios, down to 12 sites, its older
// full list frozen since 2019) and taste-index (a list of galleries already read).
// Also checked and not adapted: The Headless Club (about 125 headless commerce stores, no
// new entries since November 2023), Branding Website (brand identity projects, not
// sites), WonderList (Figma website templates), The Animated Web (CodePen demos and
// animation posts, nothing new since 2021), nextjs.design (a directory of Next.js dev
// tools), LandingHero (landing-page-design-examples.vercel.app, a handful of links),
// CSSDSGN (the domain does not respond), and Well Designed Sites, W3design, Showcase
// Supply and Fonts in the Wild (403 behind a bot challenge).
// Also checked and not adapted: Design Sphere (designsphere.xyz, a client-rendered shell
// of "design narratives"), PageInspo (UI patterns, no site links in the HTML), Design
// Excellence Awards (webdesignawards.co, a Base44 app with no site links), onlyfolios.com
// (a GoDaddy builder page) and websites.fyi (an empty page).
// Also checked and not adapted: HUMANS (humans.fyi, the domain does not resolve) and
// freshdesign.io (serves an empty page).
// Also checked and not adapted: the Ycode showcase (Vercel's bot checkpoint answers 429),
// Dora's showcase (dora.run, does not respond), the Nordcraft (formerly toddle) and
// Readymag inspiration pages (404), the Taxi.js and Highway home pages (no showcase, a
// handful of links), Unbounce's landing page examples (403), Design Licks (now redirects
// to a local marketing agency), thelist.design (a client-rendered Base44 app),
// applanding.page and landing.page (a single outbound link) and websiteofstuff.com (now
// casino spam).
// Also checked and not adapted (from Dezi's design-inspiration directory): Best in Web3,
// mnmm.xyz, Nice Folios, wellmade.fyi, rwdb.kr and design.web-hon.com (the domains do not
// respond), wdawards.com, dmdev.it, Design Everywhere and Mekikiki (403) and Design
// Reviewed (HTTP 520).
// Also checked and not adapted: Motion Folios (client-rendered on Divhunt, its portfolio
// and studio lists load from the builder's API), Leadership Folios (about 35 annotated
// portfolios of design leaders), AI Website Gallery (sites made with AI builders, mostly
// small German local businesses), Launchscene (product launch videos, not sites),
// Pixelvault (403 behind a bot challenge), the Fontshare and Future Fonts in-use pages
// (client-rendered), Velvetyne's (redirects to a single post), the in-use pages of Lineto,
// 205TF, Collletttivo, Dharma Type, Atipo, Newglyph, Ohno, Letters from Sweden and
// Tightype, and the Breakdance, Netlify, Duda and Theatre.js showcases (404).
// Also checked and not adapted: Best Design Awards (bestawards.co.nz, its robots.txt bars
// AI crawlers), Owwly (robots.txt disallows /feed), CloneAny's gallery (clones of
// CloneAny's own demo pages), the AIGA Design Archives (403 behind a bot challenge), the
// RGD Awards (branding and in-house categories, no websites), LeadAwards (no edition
// since 2019), Made With GSAP (JavaScript effects, not sites), and Tokyo Interactive Ad
// Awards and ADC*E (the domains do not respond).
// Also checked and not adapted: saas.design (robots.txt disallows every crawler), Made in
// Figma Sites (madein.figma.site, about 15 sites rendered client-side), Kopf & Stift's
// "besten Webseiten" post (a German agency's list, about 55 linked sites), the Hygraph and
// Payload showcases (a handful of customer sites), Unsection (now 403 behind a bot
// challenge, its sitemap too), AI Goodies' portfolio collection (one newsletter post of 15
// portfolios), Thanor (a blog, no gallery), saasdesign.io (a parked lander), Websites That
// Work and Baked (agency sites, not galleries) and DesignBookmark (a directory of tools).
// Also checked and not adapted: MarCom and AVA Digital Awards (AMCP's programmes, like
// Hermes: marketing collateral, winners listed on enter.amcpros.com), Swiper's home page
// (its outbound links are sponsors, many of them casinos), Design Vault (now redirects to
// Screens Design, app screens), Savee and Cosmos (moodboard apps), TypeRoom (typography
// articles), Inspiration Hut (now a font shop), Sites That Slap (a Leeds agency), the
// Silverstripe, UIkit, Expression Engine, Foundation, htmx, Saleor, Carrd, Softr, Dorik,
// Umso and PageCloud showcases (no site links in the served HTML, 403 or 404), the
// Contentful customers page (429), the NaN, Bold Monday and Fontfabric in-use pages (404),
// and design.gallery, web.gallery, designhunt.co, siteset.co, websitesthatsell.com,
// landingpagesgallery.com and websitefolio.com (parked landers).
// Also checked and not adapted: the Relume showcase (relume.ai/showcase, about 185 sites
// built with Relume, mostly small local businesses, freelancers' portfolios and webflow.io
// staging builds), Mobbin Sites (robots.txt bars AI agents from all but its marketing
// pages, and the served page carries no site links), Kopf & Stift's list (now headed
// "320+", it still links about 55 sites, mostly local businesses), Magazine du Webdesign
// (a dormant blog whose served pages link to a casino), Zrzut.pl (a parked domain for
// sale), Carbonmade's showcase (a handful of links), Locomotive's work page and Theodore
// HQ (studio sites, not galleries), and Flowjam, FrameThrower and Made with Vibe (launch
// videos, film references and a vibe-coding course, not site galleries).
// Also checked and not adapted: a-fresh.website (a Vercel bot checkpoint answers 429),
// Boring Websites (boringwebsites.info, serves an empty shell), Motion Sites (motionsites.ai,
// no site links in the served HTML), Interface Index (a handful of outbound links), Eye
// Cannndy (403), Super's showcase (Notion-built sites, mostly docs and personal pages),
// Showit's showcase (no site links in the served HTML, robots.txt asks a 10s crawl delay)
// and Godly (now redirects to Recent, already adapted).
// Also checked and not adapted: Italian Web Gallery (italianwebgallery.it, no new entries
// since December 2013), Online Design Awards (design of every kind: calendars, stamps and
// products, few websites), Dossier Design, designcollection.jp and Crafted by Love (the
// domains do not respond or sit behind a challenge), rhooo.com, websites.fyi and CSS Glance
// (parked or for sale), refs.gallery, curated.supply and Web Designer News (behind Vercel's
// bot checkpoint), Hoverstate's hoverstate.design (does not respond), Best Website Gallery's
// "Latest links" (developer tools, not sites), Pattern Club, Substratum, TYPE01, Ripplix,
// SearchSystem and Visuelle (patterns, image tools, typography and graphic design, not site
// galleries), cmd+shift design (a reCAPTCHA wall), and the Vercel, Shopware, Sanity and
// Webiny customer pages (a handful of corporate case studies).
// Also checked and not adapted (from the Inspirectory, mkdir.directory, Curation of
// Curations, Web Gallery Submission and designresourc.es directories and the
// awesome-design lists): Nice One I Like (niceoneilike.com, about 2,500 sites, no new
// entries since July 2022), BeautifulPress (WordPress sites, mostly small local
// businesses, with hosting affiliate links), Blog Design Heroes (dormant, a sibling of
// CartFrenzy and Folio Focus), TypeInspire (a WordPress error page), Digital Design Days'
// award (award.ddd.it now redirects to the conference site), Capslock Design (now a
// studio site), Meet the Creatives and Design Disciplin (interviews and a newsletter),
// Creative Portfolios and Creative Ad Awards (the domains do not respond), linear.style
// (a single style reference), inspo.site (a waitlist page), gallery.design and
// nice.design (unrelated businesses) and Retrobox (an empty shell).
// Also checked and not adapted: Motion Folios (motion designers' portfolios, rendered
// in the browser from a Divhunt API, no site links in the served HTML), Vuoden Huiput
// (Grafia's Finnish design awards: about 30 website entries across all its years, its
// work API answers 403), Viewport Gallery (its script bundle is gone), Interface Index
// (B2B and desktop interface elements, not sites) and Leadership Folios (annotated
// design-leadership portfolios, a handful of links). Pure Sites, Inspoweb, A Fresh
// Website, Good Cart, refs.gallery, curated.supply, Web Designer News, Saaspo and
// SiteInspire still answer with Vercel's bot checkpoint, Lapa Ninja, Land-book,
// Maxibestof, Web Design Inspiration, DesignRush and Web Design Museum with Cloudflare's,
// and Styleboost and Best Product Sites do not respond.
// Also checked and not adapted (from toools.design's list, designbookmark's 347 sites,
// French, Spanish and Japanese roundups and gallery submission lists): Nikolai Bain's
// examples (a Webflow freelancer's B2B SaaS page examples, about 80 distinct sites),
// Colorlib's "best <industry> websites" posts (a theme vendor's listicles, mostly
// locksmiths, car washes and other small local businesses), Best Websites Around the
// World (CSS Boutique's nominees, mostly small businesses), Cssfox (no new entries since
// 2024), Vetted Design (formerly Flat Trendz, dormant), Website Awards and djangosites.org
// (403 behind a bot challenge) and Creative and Link, CMS Designs, Drupal Museum, We Love
// CMSMS and Website Launchpad (the domains do not respond or answer 5xx).

// Also checked and not adapted: Developer Portfolios (github.com/emmabostian/
// developer-portfolios, about 2,100 portfolios added by open pull request with no
// editorial pick, mostly students' vercel.app and github.io pages), MadeWithVibe
// (vibe-coded apps, not picked for design) and VisualPH (the domain does not resolve).
// Also checked and not adapted: Webguru Awards (webguruawards.com, about 4,700 paid
// submissions of which about 4,400 are listed as winners, jury scores near 8 for nearly
// all), CSS Reel (robots.txt bars ClaudeBot and anthropic-ai, and its home page links
// casinos), and the GitHub lists awesome-personal-websites (logancyang, dormant since
// 2020), awesome-dev-websites (christopherkade, dormant since 2021), awesome-landing-page
// (nordicgiant2, page templates) and awesome-vibe-coding-websites (AI-generated templates).
// SANKOU!, earlier set aside as mostly recruiting subpages, is adapted (sankou.js): about
// three in four of its cards link to a site's home page and about one in fifteen to a
// recruiting page.

export const GALLERIES = [awwwards, cssdesignawards, refero, onepagelove, curated, httpster, cssnectar, minimalGallery, darkmodedesign, siteofsites, admiretheweb, bestwebsitegallery, typewolf, hoverstates, siiimple, landinglove, ecommdesign, brutalistwebsites, footerdesign, mindsparklemag, deadsimplesites, landingfolio, csswinner, navbargallery, designnominees, semplice, webdesignclip, csslight, details, saaspages, saaslandingpage, sitesee, landinggallery, cssline, orpetron, unmatchedstyle, a1gallery, seesaw, landingsdev, pricingpages, typio, fourohfours, killerportfolio, webinspoo, astro, gatsby, nuxt, lenis, kirby, wordpress, statamic, muuuuu, awwwardshonorable, wallofportfolios, osmo, wagtail, darkdesign, io3000, responsivejp, ikesai, gallereee, mosaic, saasui, cursorup, oneguu, desengs, wpgallery, storefolio, curategallery, browsingmode, herogallery, threedwebsites, mesh3d, klikkentheke, cryptodesignclub, choooodoii, shopsiteawards, designforb2b, uidesignstudio, finpantheon, landingpagegallery, justadesignlist, glance, tinyblocks, lowww, perfolios, ogimagegallery, designdetails, inspolanding, dragdropship, sectionswtf, topcssgallery, brik, goodwebdesign, nook, brilliantdesign, designnokoto, koreawebdesign, reeoo, arche, lowwwcarbon, framergallery, bestsaaswebdesigns, recent, storefront, palate, uxportfolios, peekpaper, somewhatcreative, animorio, brutalistgarden, typelol, typefoundrydirectory, mabtu, brianlovin, catalog, storeinspo, uidiscovery, uisections, designatlas, norrly, studioarchives, foliosgallery, ecomgallery, purelanding, madeonweb, lovieawards, w3award, communicatorawards, horizoninteractive, webaward, europeandesign, germandesignaward, germanbrandaward, commarts, gooddesignaustralia, visuelt, appliedarts, tagline, altinorumcek, azevhonlapja, bigcommerce, woocommerce, dtcgallery, flatinspire, longlist, bestagencysites, studioeditorspick, kasou, webdesigninspiration, mooistewebsites, soreiine, webdesignerdepot, s5style, pafolios, bestfolios, cofolios, fountn, bentogrids, delightful, gooddesigngallery, awwwardsnominees, csswinnernominees, swup, saasframe, portfolioproject, wowoworks, cmsdesign, awwwardsdirectory, webflowenterprise, designdobrasil, fortyeightgallery, allwebsites, aidesigner, techstars, finc, speedrun, hallointer, theindex, theresponsive, tailwind, creativetable, webavantgardes, refto, awesomeportfolios, ctagallery, pagedone, portfolioideas, webdesktops, headlessclub, designerportfolios, sankou];
