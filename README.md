# Sqrap

A public design-inspiration library of real, well-designed websites. A local
pipeline discovers sites, captures them at desktop and mobile widths, and
publishes the ones that pass a quality gate. Visitors browse sites and their
screens, search, and filter by platform, page pattern, industry, color, theme, style and country. There is no
sign-in and nothing is saved.

Every captured site is shown with a link to its source domain. The pipeline
honors robots.txt, never presents a site's logo as Sqrap's own, and skips any
domain that has opted out. The browse UI reads the database through the route
handlers below, and shows only `approved` sites whose domain is not in
`optouts`.

## Community and app taxonomy

`lib/taxonomy.js` is the shared vocabulary for browse filters, the judge,
markdown catalog, Agent API, MCP and OpenAPI. Community pages use **Feed**
(ranked/chronological member posts or links), **Post** (one member post/thread),
**Profile** (user/maker), **Submit** (posting form) and **Leaderboard** (ranked
people/items). **Blog** and **Article** remain site-authored editorial content.
**Feed list** sections include post metadata and voting/ranking controls;
**Comments** sections contain replies. **Community & Social** covers forums,
link aggregators, launch communities and social apps. Filters and the catalog
list these values even at zero captures; this does not imply available designs.

For a daily upvote feed, fetch
`/designs.md?industry=Community%20%26%20Social&pattern=Feed`, or pass those filters
to `design_brief` / `search_screens`. Discovery prioritizes feed, post, profile,
submit and leaderboard routes before marketing subpages; HN-style `/item?id=`
and `/user?id=` links retain their identifying query parameter.

Existing sites keep their labels: no migration or library-wide judging is needed.
For one already-captured site, `npm run judge -- --retag <domain>` updates page
patterns and section types only; `--dry-run` previews those tags without writes.
To also update industry, `npm run judge -- <domain> --dry-run` previews the home
judgement; `npm run judge -- <domain>` saves it and styles/tags the site if approved
(it can change approval status). These commands require captured images and AI
credentials; do not re-judge the whole catalog for this additive vocabulary.

## Run it

Sqrap is a Next.js app (App Router). Node 20.9 or newer.

```sh
npm install
vercel link && vercel env pull  # DATABASE_URL (Neon) and BLOB_READ_WRITE_TOKEN into .env.local
cp .env.example .env         # then fill in the keys you need
npm run db:migrate           # creates or upgrades the Postgres schema
npm run dev                  # http://localhost:3000
npm run build && npm start   # production build
```

Schema changes ship on merge to main: Vercel builds with `npm run vercel-build`
(pinned in `vercel.json`), which applies pending `db/migrations/` before
`next build` on every production build (`VERCEL_ENV=production`: a merge to
main, but also `vercel --prod`, a production redeploy or a promote) and fails
the deploy if one fails. Preview and development builds skip it, because every
environment shares one database and an unmerged branch must not change the
production schema. Write migrations so the code still live during the build
keeps working (add, don't rename or drop in the same deploy); an instant
rollback does not undo them.

The project was called Jethro before; every `SQRAP_*` variable still falls back
to its old `JETHRO_*` name when unset, so existing environments keep working.

## Discover sites

Discovery fills the `sites` table with candidates (`status='discovered'`),
deduplicated by registrable domain and skipping galleries, social sites and
opted-out domains. It never downloads gallery images, only outbound URLs and
metadata, and it honors each gallery's robots.txt at 1 request per second.

```sh
npm run discover -- --source galleries --limit 200   # design galleries
npm run discover -- --source search                  # Brave Search (needs BRAVE_API_KEY)
npm run discover -- --only httpster --limit 20       # one adapter
npm run seed -- https://a.com https://b.com          # hand-picked sites
npm run seed -- --file seeds.example.txt
```

`--source` takes `galleries`, `search`, `seeds` or `all` (default); `seeds`
reads `seeds.txt`, else `seeds.example.txt`, unless `--file` is given. Search
runs at most `--max-queries` (default 30) queries per run.

`--limit` caps the new sites a run adds. Sites already in the library do not
count toward it, so each run reads past the gallery entries earlier runs took,
up to ten times the limit in candidates. Refero, Site of Sites, Details Inspo, SiteSee
Landing Gallery, A1 Gallery, Landings, Webinspoo, Wall of Portfolios, Gallereee, Mosaic, SaaS UI, Hero Gallery, Mesh3D, Crypto Design Club, Arche Directory, BestSaaSWebDesigns and the Gatsby showcase are read from their sitemaps, and they, Admire the Web,
Typewolf, SaaS Pages, SaaSFrame, Orpetron, Unmatched Style, See*Saw and Killer Portfolio skip the detail pages already stored
as a site's source.

Paged galleries (Awwwards, CSS Design Awards, One Page Love, Minimal Gallery,
CSS Winner and the others read with `?page=` or `/page/<n>`) skip entries whose
domain or detail page is already stored, so known entries use none of a run's
reads. Each reads page 1 for new entries and then resumes at the page an earlier
run reached, kept in the `gallery_cursors` table (`npm run db:migrate` adds it;
without it they read from page 2). Every run reaches further into an archive,
such as the roughly 7,400 Awwwards Sites of the Day, instead of re-reading its
first pages.

| Adapter | Status |
| --- | --- |
| Awwwards (Sites of the Day) | working, resumes at the page the last run reached |
| CSS Design Awards (website gallery) | working |
| Refero Styles | working, one style page fetched per new site |
| One Page Love | working, genre mapped to industry |
| Curated | working |
| Httpster | working |
| CSS Nectar | working |
| Minimal Gallery | working |
| Dark Mode Design | working |
| Site of Sites | working, read from its sitemap newest first, one page fetched per new site |
| Admire the Web | working, one detail page fetched per new site |
| Best Website Gallery | working |
| Typewolf (Site of the Day) | working, one detail page fetched per new site |
| Hover States | working, read from its archive data newest first |
| Siiimple | working |
| Landing Love | working, category mapped to industry |
| ecomm.design | working, every site tagged E-commerce |
| Brutalist Websites | working, one page lists every site newest first |
| Footer.design | working |
| Mindsparkle Mag | working, read from its sitemap newest first, one post fetched per new site, category mapped to industry |
| Dead Simple Sites | working, one page lists every site newest first |
| Landingfolio | working, read from its listing API newest first, category mapped to industry |
| CSS Winner (Sites of the Day) | working |
| Navbar Gallery | working |
| Design Nominees (Sites of the Day) | working |
| Semplice Showcase | working, one page lists every site |
| Web Design Clip | working, category mapped to industry |
| CSS Light (featured sites) | working |
| Details Inspo (formerly inspo.page) | working, read from its sitemap, one page fetched per new site, industry tag mapped |
| SaaS Pages | working, one detail page fetched per new site, every site tagged SaaS |
| SaaS Landing Page | working, tags mapped to industry, falling back to SaaS |
| SiteSee | working, read from its sitemap newest first, one page fetched per new site, tags mapped to industry |
| Landing Gallery | working, read from its sitemap newest first, one page fetched per new site |
| CSSline | working |
| Orpetron (awarded and nominated sites) | working, one detail page fetched per new site |
| Unmatched Style (gallery) | working, read from its WordPress API newest first, one post fetched per new site, categories mapped to industry |
| A1 Gallery | working, read from its sitemap newest first, one page fetched per new site, templates skipped, type and category mapped to industry |
| See*Saw | working, read from its home page newest first, one page fetched per new site, categories mapped to industry |
| Landings (landings.dev) | working, read from its sitemap newest first, one page fetched per new site, every site tagged SaaS |
| Pricing Pages | working, pricing page links reduced to the site, every site tagged SaaS |
| Typ.io | working, typography sample links reduced to the site, tags mapped to industry |
| 404s.design | working, 404 page links reduced to the site |
| Killer Portfolio | working, one detail page fetched per new site, every site tagged Agency & Portfolio |
| Peek Paper | working, every post page read from its sitemap, only editions with an unseen post read from their JSON newest first, each post links straight to the site |
| SomeWhat Creative | working, every monthly "Best Made Websites" post read in one WordPress REST request, each heading links straight to the site |
| Animorio | working, its English journal index lists every "how it's made" article newest first on one page, each card links straight to the site |
| Brutalist Garden | working, one page lists every site, each card links straight to the site |
| Type.lol | working, every foundry page read from its sitemap, foundries in its "New on Type.lol" feed first, one page fetched per new foundry, each links to the foundry's site, country mapped, every site tagged Agency & Portfolio |
| Type Foundry Directory | working, one page lists every foundry, each card links straight to its site, country mapped, every site tagged Agency & Portfolio |
| MABTU | working, every site page read from its sitemap, most recently captured first, one page fetched per new site, sites it rates below 7 and marketplace templates skipped, industry mapped |
| Brian Lovin's Sites | working, one page lists every site, each row links straight to the site |
| Catalog | working, one page whose served flight data lists every brand with its outbound link, newest first, industry tags mapped to industry, E-commerce when none fits |
| Storeinspo | working, every store page read from its sitemap, one page fetched per new store, categories mapped to industry, E-commerce when none fits |
| UI Discovery | working, every site page read from its sitemap in the gallery's rank order, one page fetched per new site, category mapped to industry |
| UI Sections | working, every company page read from its sitemap, one page fetched per new site, industries mapped, SaaS when none fits |
| Design Atlas | working, every site page read from its sitemap newest first, one page fetched per new site for its JSON-LD, industry (else type) mapped to industry |
| Norrly | working, every breakdown page read from its sitemap, one page fetched per new site for its JSON-LD, category mapped to industry |
| Studio Archives | working, one page lists every studio in an inline data array, no detail page fetched, country mapped to an ISO code, every studio Agency & Portfolio |
| Folios.Gallery | working, every /sites/<slug> page read from its sitemap, one page fetched per new site for its outbound link, every site Agency & Portfolio |
| Ecomgallery | working, read from its WordPress API newest first, two requests for the whole gallery, each post's Visit Site button links straight to the store, category mapped to industry, E-commerce when none fits |
| Pure (purelanding.page) | working, every /inspirations/ page read from its sitemap newest first, one page fetched per new site for its Explore Site link, category then industry labels mapped to industry, templates skipped |
| Made on Web | working, every /website/<slug>/ page read from its sitemap newest first, one page fetched per new site for its JSON-LD url, industry keyword mapped to industry, else E-commerce or Agency & Portfolio from the site type |
| The Lovie Awards | working, the website category groups of its two kept seasons read from its winners sitemaps, newest season first, each group's /all/ page lists every winner with its Launch Project link, category mapped to industry, email newsletters skipped |
| The W3 Awards | working, the Websites gallery of its two kept seasons found in its winners sitemaps, newest season first, 27 winners a page sorted by award, Best in Show and Gold read and Silver skipped, each card's Visit button links straight to the site, category mapped to industry |
| The Communicator Awards | working, the Websites gallery of its two kept seasons found in its winners sitemaps, newest season first, filtered to the Award of Excellence, each card's view project button links straight to the site, category mapped to industry |
| Horizon Interactive Awards | working, each web site category page of its showcases read newest year first (2023 on; older years use other markup), Gold and Best Overall Design winners link straight to the site, category mapped to industry |
| The WebAwards | working, Best of Show and Best of Industry winners of its latest four years read from its winners search (a POST), newest year first, one winner page fetched per new site for the site its headline links to, category mapped to industry, Small Business skipped |
| The European Design Awards | working, Gold, Silver and Bronze winners of its website categories (Brand & Campaign, Information, E-Commerce, Self-Promotion Digital) in its latest ten years, read from its winners search (a POST that needs the page's session and CSRF token), newest year first, one winner page fetched per new site for the site linked under its headline, links to agency case studies and staging hosts skipped |
| German Design Award | working, Winners and Golds of its Web category in its latest six years, read from the JSON filter route its gallery page names, newest year first, 48 a page, one winner page fetched per new site: a site named in the title, else the customer's link unless it is the designer's own, else the studio's own site when the title names it (an agency's entry that links only itself is skipped) |
| German Brand Award | working, Winners and Golds of its "Brand Communication – Web & Mobile" category (10 to 20 a year, mostly brand and corporate sites from the German-speaking countries), read from the same German Design Council gallery as the German Design Award and with the same rules; a brand's in-house site is kept when the title names it, and 2023's winner pages carry no credits, so that year adds little |
| Communication Arts Interactive Annual | working, Websites/Microsites winners of its latest ten years, read from the JSON route its gallery's filter names, newest year first, 20 a page, one winner page fetched per new site for its "Launch Site" link (in the credits on older pages), industry mapped from the category line |
| Australian Good Design Awards | working, winners of its Web Design and Development discipline read from its WordPress API newest first, one project page fetched per new site, its "view website" link passed over for the next when it names a credited designer rather than the commissioner, entries that link only their agency skipped |
| Visuelt (Grafill) | working, Digital design winners of its latest ten years, each year's category page read in its order, newest year first, student, installation and game, design system, editorial and mobile classes skipped, one winner page fetched per new site for the link that ends its credits (most winners of 2018 and of 2021 to 2024 link none and are skipped), the client credit kept as the name, e-commerce and self-promotion classes mapped to industry |
| Applied Arts Awards | working, website categories of its Design and Interactive groups in its latest ten years, each year's categories read from the fragment its archive filter loads, each category's winners page read in its order, newest year first, Young Blood categories skipped, one winner page fetched per new site for its "Winning Website" link (not the entrant agency's), the client credit kept as the name, e-commerce, self-promotion, charity and educational classes mapped to industry |
| Tagline Awards | working, gold, silver and bronze winners of its Websites group read from each year's winners page, newest year first (2019 on; 2020 and 2021 share a page), gold first within a year, shortlisted cards and the online game, highload and development categories skipped, video, app store and case-study links and projects shown on the agency's own site skipped, the client credit kept as the name, education, culture, automotive, community, real estate, retail and marketplace, finance, medicine and media categories mapped to industry |
| Altın Örümcek | working, first, second and third places and the best website of its latest six years read from each year's results page, newest year first, best website first within a year, each card links straight to the site, mobile app, social media, online advertising, campaign and advergame categories, public favourites and the accessibility prize skipped, app store and social links skipped, the card title kept as the name, banking, e-commerce, education, culture, real estate, health, automotive, tourism, food, fashion, agency, social responsibility and news categories mapped to industry, `.tr` sites given country TR |
| Az Év Honlapja | working, the absolute winner, category winners and quality prizes of its latest six years read from each year's winners page, newest year first, absolute winner first within a year, then category winners, then quality prizes, each line links straight to the site, special prizes and the public vote skipped, app, technology, AI marketing, blockchain and small-business first-website categories skipped, the link text kept as the name, e-commerce, education, health, real estate, culture, media, non-profit, tourism, hospitality, portfolio and community categories mapped to industry, `.hu` sites given country HU |
| BigCommerce Showcase | working, the featured feed and every category page read from the feed each page embeds in `__NEXT_DATA__`, one request per category for the whole gallery, each entry's external url links straight to the store, featured stores first, then the categories in the page's order, automotive, education, fashion, food, health and travel categories mapped to industry, E-commerce otherwise |
| WooCommerce Showcase | working, the showcase page read for the grid's nonce and shuffle seed, then its load-more endpoint (admin-ajax.php, which robots.txt allows) for 24 cards a request, about seven requests for the whole gallery, each card's Visit link goes straight to the store, vertical tags mapped to industry, E-commerce otherwise, country tag kept as the country |
| DTC Gallery | working, one home page lists every direct-to-consumer brand in the gallery (about 60, mostly Australian and New Zealand stores), each card links straight to the store, beverage and food categories mapped to Food & Drink, health and body to Health, apparel to Fashion, E-commerce otherwise, `.au` and `.nz` stores given their country |
| Flat Inspire | working, its home page listing read with `/page/<n>/`, newest first, 12 sites a page, stopping at page 20 (early 2014; the gallery runs from 2013 to 2018), each card's image links straight to the site, the card's detail page kept as its source, mobile-app, infographic and resource cards skipped, e-commerce, product, education, food, health, travel, cause, agency, portfolio, software and web-app categories mapped to industry, services and misc left unmapped |
| Longlist | working, the whole directory of design studios, independent designers and type foundries (about 1,430) read from its published `/data/entries.json` newest first, one request a run, each entry's website taken as the site and its Longlist page kept as the source, entries already stored by domain or source skipped, ISO country kept, studios whose first discipline is architecture Architecture & Interior, every other entry Agency & Portfolio |
| Best Agency Sites | working, its `/websites` listing read with `/websites/p<n>`, newest first, 24 sites a page (about 17 pages), each card's Visit link goes straight to the site and its detail page is kept as the source, a page that fails is skipped rather than ending the read (page 12 answers HTTP 500), the whole listing re-read each run with sites already stored by domain or source skipped, architecture and interior studios mapped to Architecture & Interior, every other entry Agency & Portfolio |
| Studio Editor's Pick | working, the monthly posts (April 2024 on, five to nine sites each, about 170 in all) in which the editors of Studio, the Japanese no-code builder, pick its best-designed sites, found in the blog's sitemap and read newest first, each pick's first outbound link under its heading taken as the site (Studio's own Showcase, Experts and Help pages and the credited studio's link passed over), the post kept as the source, sites already stored skipped by domain |
| KASOU | working, every `/website/<id>/` page read from its sitemap, highest id (newest) first, one page fetched per new site for the outbound link under its heading, pages already stored as a source skipped, withdrawn entries without a link passed over, no industry mapped (the gallery files industries only as listing pages) |
| Web Design Inspiration (webdesigninspiration.io) | working, its landing-page board (about 110, March 2025 on) and its feature, demo and pricing section boards (about 40) read from the `__NEXT_DATA__` each static page serves, four requests for the whole gallery, landing pages first and newest first, each entry's address taken as the site and the board kept as the source, no industry mapped |
| Mooiste Websites (mooistewebsites.nl) | working, a Dutch gallery of custom-built sites (about 510, 2022 on, mostly Dutch and Belgian companies, schools and nonprofits), every `/website/<slug>` page read from its sitemap, most recently changed first, one page fetched per new site for its "Bezoek website" button (the credited studio's link passed over), pages already stored as a source skipped, the page's own categories mapped to industry and its Nederland and België tags to a country |
| Soreiine!! (soreiine.jp) | working, a Japanese gallery in which a working web director picks sites and says why (about 590, 2021 on, mostly Japanese corporate, recruiting, brand, shop and campaign sites), every pick page read from its post sitemap, most recently changed first, one page fetched per new site for the link on its screenshot, pages already stored as a source skipped, the page's own industry category mapped to industry (its online-shop type as a fallback) |
| Webdesigner Depot (Best New Websites) | working, its monthly "20 Best New Websites" roundups (April 2020 to November 2024), the yearly "best websites of" roundups and the earlier monthly "Best New Portfolios" (December 2015 to March 2020), about 100 posts found through two title searches of the blog's WordPress API and read newest first, each heading's link (or the first outbound link after it) taken as the site and the post kept as the source, sites already stored skipped by domain, portfolios tagged Agency & Portfolio; the series has had no new posts since November 2024 |
| S5-Style (s5-style.com) | working, a Japanese gallery whose official curators' "Good Web Design" picks (about 7,200, 2012 on, mostly Japanese corporate, brand, product, campaign, studio and shop sites) are paged with /page/<n>/ newest first, 120 a page read from the `__NEXT_DATA__` each page serves, so no page per site is fetched; users' own bookmarks (/all/) are not read, recruiting sites are skipped, site type (else category) mapped to industry, a 404 past the last page ends the listing |
| Pafolios (pafolios.com) | working, a hand-picked gallery of design portfolios (about 900, 2020 on: product and UX designers, design engineers, creative and brand designers, studios), every record read from the Next.js flight data the home page serves, so one request reads the whole gallery, each address once from its newest record, newest first, each record's /<slug> page kept as the source, every site tagged Agency & Portfolio |
| Bestfolios (bestfolios.com) | working, a hand-picked gallery of designer portfolios (product and UX designers at tech companies, graphic, brand and motion designers), read from the /api/portfolios JSON its client-rendered pages load, which returns only the newest 100, so each run takes the latest additions, each address once, newest first, each /portfolio/<authorlink> page kept as the source, every site tagged Agency & Portfolio |
| Cofolios (cofolios.com) | working, a hand-picked gallery of about 190 portfolios of product designers from Airbnb, Apple, Google, Meta, Microsoft, Amazon and other tech companies (2020 to 2024), read from the public Firestore collections its client-rendered pages load, one per company group, each address once, newest first, each /portfolio/<Full-Name> page kept as the source, every site tagged Agency & Portfolio |
| Fountn (fountn.design) | working, a design-resources library whose Websites section is a small hand-picked gallery (about 30, 2024 on: landing, SaaS, AI and studio sites), read from its public WordPress REST API newest first, so no page per site is fetched, each /website/<slug>/ page kept as the source, site type (AI, Crypto, Ecommerce, Portfolio, SaaS) mapped to industry |
| Bento Grids (bentogrids.com) | working, a hand-picked gallery of bento-grid layouts cut from product and marketing sites (Linear, Vercel, Attio, Clerk, Raycast, Neon), every shot read from the __NEXT_DATA__ the home page serves, so one request reads the whole gallery, "ui" shots only, template demos on framer.website and webflow.io skipped, each host once, newest first, the home page kept as the source |
| Delightful (delightful.click) | working, a hand-picked library of design references from about 1,600 brands, each tiered S or A, read from the one index.json its client-rendered library loads, web heroes, pages and sections only (about 520), Mobbin and X clips refused, agency case-study pages skipped, each host once, most recently captured first, each item's library page kept as the source, sector tags mapped to industry |
| Good Design Gallery (gooddesign.gallery) | working, a small hand-curated archive of websites, interfaces, identities and motion its editors pick out of X, Threads and Instagram, Websites category only (about 25), every entry read from the one served /?discipline=Websites page, entries that link only to the post they were found in (Instagram, X, Threads, Contra) skipped, each host once, newest first, each /design/<id> page kept as the source, portfolios tagged Agency & Portfolio |
| SaaSFrame (saasframe.io) | working, a library of real web and app screens from about 360 SaaS products, every product read from the one served /saas page (most recently added first, with its category), one product page fetched per new site for the site named in its Organization JSON-LD (its Visit website button otherwise), pages already stored as a source skipped, categories mapped to industry with SaaS as the fallback |
| Portfolio Project (portfolioproject.io) | working, a reviewed gallery of about 270 portfolio sites of product designers, design engineers, motion designers and small studios (2024 on), every approved entry read from the flight data of the one served home page, most recently reviewed first, each host once, each /website/<slug> page kept as the source, every site tagged Agency & Portfolio |
| Wow! Works (wowoworks.com) | working, a hand-picked Japanese web design gallery of about 520 sites (2018 to February 2022, mostly Japanese corporate, brand, shop, recruiting and portfolio sites), its home page read with `/page/<n>/`, newest first, 12 sites a page, each card links straight to the site, recruiting sites (採用, リクルート) skipped |
| cms design (cmsdesign.jp) | working, a Japanese gallery of about 2,100 sites built on a CMS (mostly WordPress, some Shopify, STUDIO, microCMS, a-blog cms; May 2019 to April 2026), its home page read with `/page/<n>/`, newest first, 24 sites a page, each card links straight to the site, each /cms/<cms>/<id>/ detail page kept as the source, recruiting pages (採用, リクルート, /recruit/) skipped |
| Awwwards Directory (awwwards.com/directory) | working, the studios, agencies and freelancers with an Awwwards profile, ranked by their wins (Sites of the Day, then Honorable Mentions), read with `?page=<n>`, 24 a page, each card links straight to the member's own site, its profile page kept as the source, country mapped, every site tagged Agency & Portfolio, the listing ends at the first member with no award (about 1,060 members, 45 pages) |
| Webflow Enterprise Partners (experts.webflow.com) | working, the top tier of Webflow's Certified Partners directory (about 170 of its 2,100 partners: Finsweet, Refokus, Edgar Allan, Noomo, OFF+BRAND...), its browse listing read with `?5b5090bd_page=<n>`, 10 partners a page, about 210 pages, only cards marked Enterprise kept, one webflow.com/@<slug> profile fetched per new partner for the site its data names, the profile kept as the source, country mapped, every site tagged Agency & Portfolio |
| Design do Brasil (designdobrasil.co) | working, a hand-picked gallery of about 140 portfolios of Brazilian designers (product, brand and motion designers, art and creative directors, small studios), every card read from the one Framer home page, each cover links straight to the portfolio, each address once in page order, the home page kept as the source, every site tagged Agency & Portfolio and Brazil |
| 48 Gallery (48gallery.com) | working, a hand-picked gallery of about 145 websites (designer and developer portfolios, studios, photographers, fashion, architecture and culture sites), every `/inspiration/<slug>` page read from its Framer sitemap in its order, newest picks first, one page fetched per new site for the link under its heading, pages already stored as a source skipped, no industry hinted (the pages carry no category) |
| AllWebsites.Design (allwebsites.design) | working, a curated design-research archive of about 300 websites (studios, portfolios, SaaS and AI products, finance and commerce sites), every `/archive/<slug>` page read from its sitemap in its order, one page fetched per new site for its JSON-LD (the studied site's URL and name, the breadcrumb's category mapped to industry), pages already stored as a source skipped |
| AIDesigner references (aidesigner.ai/references) | working, a hand-picked library of live websites filed by section and by industry or style (about 340 sites: SaaS, AI and developer-tool products, studios, fashion, food, hotels, editorial), the `/references` hub and every `/references/websites/<collection>` page in the sitemap read for the 24 cards each serves in its Next.js flight data (the rest sit behind a sign-up wall at `/library`, which robots.txt disallows), 36 requests for the whole gallery, web cards only, each address once, the card's first mappable industry tag kept as the industry |
| hallointer.net | working, a Berlin studio's platform for contemporary web design (about 620 portfolios, exhibitions, festivals, theaters, shops and experiments, each tagged with designer, type and subject); one page lists every site, newest first, read in one request; entries marked as archived and those pointing at web.archive.org snapshots are skipped, leaving about 335 live sites, the type and subject tags mapped to an industry |
| THE INDEX (theindex.website) | working, a hand-picked directory of about 80 design studios and type foundries (Bakken & Bæck, Base Design, Porto Rocha, Instrument, Dinamo, Commercial Type...), every studio's website, name and first location read from the home page's Next.js page data in one request, the country hinted, every site tagged Agency & Portfolio |
| The Responsive (the-responsive.com) | working, a hand-picked gallery of about 1,280 responsive websites shown desktop and mobile (studios and portfolios, fashion and furniture stores, architects, galleries, editorial and culture sites), dormant since August 2024; the home page read newest first with `/page/<n>/`, 12 a page, 107 pages, resuming where the last run stopped; every card links straight out to the site, its category classes mapped to an industry |
| Tailwind CSS showcase (tailwindcss.com/showcase) | working, about 45 sites built with Tailwind that its team picks (Cursor, Vercel, Supabase, PostHog, Column, The Verge, Der Spiegel, Google I/O, NASA JPL...), every card now served in the HTML and read in one request; cards labeled Template (Tailwind's own tailwindui.com templates) skipped, go.<company> marketing links turned into the company's home page, each card's label ("Developer tool website", "News website"...) mapped to an industry |
| creative table (creativetable.de) | working, a German gallery adding one hand-picked site a day from studios, agencies, brands and startups worldwide (Rolex, Wolff Olins, Floema, Evervault, Shopify Editions...), about 30 so far; the English home page lists every entry in one request, one detail page fetched per new site for its visit link, the studio, agentur, portfolio, saas and ecommerce categories mapped to an industry |
| web-avant-gardes (github.com/gsbm/web-avant-gardes) | working, a hand-curated GitHub list of about 540 experimental, radical or unorthodox websites (designers' and photographers' portfolios, studios and type foundries, shops, art centers, magazines, bands), last added to in November 2022; its README read raw in one request, rows the curator marked DOWN skipped, the category heading or the row's description mapped to an industry |
| Refto (refto.one) | working, a hand-picked library of website design references adding a few dozen sites a week, about 455 so far (AI, SaaS and developer-tool products such as Modal, Hex, Flighty, Craft and Twenty, fintech and crypto, studios and portfolios, shops and brands); every site page read from its sitemap roughly newest first, one page fetched per new site for its ?ref=refto.one link, entries tagged plugin or template skipped, categories mapped to industry with portfolio and agency tags first |
| Awesome Personal Websites (github.com/Arif-un/awesome-portfolio-websites) | working, a hand-curated GitHub list of about 95 creative personal websites from designers and developers (Bruno Simon, Dennis Snellenberg, Lynn Fisher, Josh W. Comeau, Amelia Wattenberger, Daniel Korpai...), still added to in 2026; its README read raw in one request, rows the curator struck through as gone skipped, each row's flag title mapped to a country, every site tagged Agency & Portfolio |
| CTA Gallery (cta.gallery) | working, a gallery of call-to-action sections cut from about 520 real sites (SaaS and AI products such as Tines, Attio, Craft and Synthesia, shops and brands, studios and portfolios); entries ordered by its sitemap, newest first, and read from its 24 industry pages, which list every card with a link straight to the site, 25 requests for the whole gallery; templates (on no industry page) skipped, industry pages mapped to an industry with the narrow ones before tech and saas |
| Pagedone Inspiration (pagedone.io/inspiration) | working, the page library of the Pagedone UI kit: about 1,400 full-page screenshots from about 370 real sites, mostly SaaS and startup products (SavvyCal, Dovetail, Runway, Tally, Checkr) with some studios, shops and portfolios; read newest first from its JSON paging (eight cards a request), only each site's landing page taken, about 330 sites (subpages and hosted job boards skipped, app./get. subdomains folded into the registrable domain), about 30 narrow category pages read first for an industry hint |
| Portfolio Ideas (github.com/Evavic44/portfolio-ideas) | working, a curated GitHub list of about 420 portfolio websites from developers and designers (Brittany Chiang, Kent C. Dodds, Cassidy Williams, Victor Eke...), about 6,400 stars and still added to in 2026; its README table read raw in one request, newest rows (the bottom of the table) first, links without a scheme given https://, sites on shared hosts (vercel.app, netlify.app, github.io) kept, every site tagged Agency & Portfolio |
| Awesome Web Desktops (github.com/syxanash/awesome-web-desktops) | working, a curated GitHub list of about 340 websites that mimic a desktop operating system: portfolios (Dustin Mierau, Ash Kyd, KIM/OS, scott.is...), radio and music sites (Poolsuite, Nightwave Plaza) and web experiments (Windows 93, Webamp), about 2,100 stars and still added to in 2026; its README table read raw in one request, newest rows (the bottom of the table) first, dead links (moved by the curator to archived.md) and rows whose access note asks for a login skipped, radio and music names hinted as Music, portfolio and studio names as Agency & Portfolio |
| The Headless Club (theheadlessclub.com) | working, a directory of about 125 headless e-commerce stores picked by the Commerce-UI studio for design and performance (Sonos, Burberry, Puma, Mammut, Our Legacy, Impossible Foods); the newest 36 read from the home page's `__NEXT_DATA__` in one request, the rest from its sitemap's /site/<slug> pages newest first, one page fetched per new store, each linking straight to the store, fashion and jewelry categories mapped to Fashion, food and beverage to Food & Drink, health and beauty to Health, E-commerce otherwise |
| SANKOU! (sankoudesign.com) | working, a curated Japanese web design reference gallery of about 3,200 sites (The North Face, Morisawa Fonts, Shibuya PARCO, Wantedly, Goodpatch), new sites added most days back to 2018; paged with /page/<n>/ newest first, 81 cards a page, cards link straight to the site, /contentpage/ campaign pages inside shop sites skipped, no category on the cards so the industry is left to the judge |
| Best of Swiss Web (bestofswissweb.swiss) | working, Switzerland's national award for digital work, judged by an expert jury; its Hall of Fame read from one JSON file a year (`/integration/bosw/hall-of-fame-<year>.json`, about 160 entries each), the latest eight years newest first, Master and Gold before Silber and Bronze, shortlist skipped; only the design and product categories read (Creativity, User Experience, Brand Experience, Digital Commerce, Technology, Public Value, Business, Innovation, .swiss), campaign categories and Productivity skipped; about 260 sites (Chopard, Ricola, Transa, Zentrum Paul Klee, Museum für Gestaltung Zürich, Kanton Basel-Stadt); links to videos, presentations, agencies' case-study hosts (awardhub.ch, campaignhub.ch, weworkhardforthemoney.ch, or a host that names the agency and not the client), demo builds and sign-in apps skipped; Digital Commerce winners hinted as E-commerce |
| Parts. (partsdesign.net) | working, a Japanese gallery of website sections (main visuals, headers, footers, pricing, FAQs, forms) cut from about 470 real sites by the Tokyo studio Glatch, mostly Japanese B2B SaaS and product sites (SmartHR, KARTE, microCMS, Money Forward Cloud, Cybozu Office, Goodpatch) with some corporate brand sites (Nobel, Kadoya, OKI), new sites added every week or two; paged with /page/<n> newest first, 15 cards a page, one per site, cards link straight to the site, recruiting sites and Glatch's own site skipped, `.jp` hosts hinted as Japan, no category on the cards so the industry is left to the judge |
| 81-web.com | working, a Japanese web design gallery that picks only Japanese sites, about 5,500 corporate, brand and service sites, shops, studios and media (SmartHR, New Balance Japan, KDDI, TVer) since 2010, several added a day; the client-rendered gallery read from its same-origin JSON endpoint `/api/toppage_v2?paged=<n>`, 24 posts a page newest first, the first 100 pages (back to about 2019), recruiting sites and campaign pages inside a brand's site skipped, its industry categories and EC, media and portfolio site types mapped to an industry, every site hinted as Japan |
| Webdesign Journal (webdesign-journal.de) | working, the Leipzig agency Hahnsinn's gallery of about 870 sites it picked as the most beautiful German-language websites since 2013, mostly from Germany, Austria and Switzerland (company and brand sites, agencies and studios, theatres, universities and other portals, portfolios, a few shops such as On and ottonova); the client-rendered gallery read from WordPress's REST API `/wp-json/wp/v2/astra-portfolio`, 50 entries a request newest first, each with the site's address and categories, the Agentur, Portfolio, Shop and Blog categories mapped to an industry, `.de`, `.at`, `.ch` and `.li` (and city and state) domains hinted as their country, Hahnsinn's own sites skipped |
| Cart Craze (cartcraze.com) | working, a hand-picked gallery of e-commerce website design, about 1,720 online stores, mostly fashion, beauty, home and food brands (Arc'teryx, Herschel Supply Co., Cuyana, Lilly Pulitzer, Kurt Geiger); most picks are years old but the stores are live brands, so the judge decides; its `/ecommerce-website-inspiration` page lists every store newest first on one page, then one detail page fetched per new store for the link out, every store tagged E-commerce |
| DesignMunk (designmunk.com) | working, one curator's archive of homepage and landing-page design, about 1,180 entries over some 1,060 sites, mostly SaaS, AI, developer tool and fintech products (Hex, Tally, Plausible, Pleo, Wrapbook), growing about 200 entries a month since August 2026; read newest first from WordPress's REST API (`/wp-json/wp/v2/posts`, the site link in `acf.site_url`), categories mapped to industry; pricing-page entries fold into the site's home page; keeps the normal quality bar |
| Website Design Awards (websitedesignawards.com) | working, a free daily award (a Site of the Day, and every site its jury scores 8.0 or more joins the winners), about 765 winners over some 680 sites: since April 2026 about 130 design-led independent picks (editorial and interactive pieces, product, developer tool and studio sites, portfolios such as Stillwet, Are.na, fonts.xyz, Paper Shaders), and archive months back to 2015 filled in later with well-known sites (MDN, Nike, Radix, Metalab); now server-rendered, each `/archive/<yyyy>/<mm>` page carries its month's winners in the serialized route data, so one request reads a month, newest month first; honorable mentions not read; deep pages fold into the site's home page, deep pages on shared hosts (github.io) skipped; categories mapped to industry; keeps the normal quality bar |
| No-Code Supply Co. (nocodesupply.co) | working, Corey Moen's hand-picked directory of websites, apps and code since 2019; its Website type is about 1,650 sites, mostly built with Webflow and GSAP (SaaS and AI products, designer and studio portfolios, nonprofits, climate, real estate and food brands such as Ponder, Flockler, Abatable, The Audacious Project), a few new picks most months; its HTML listing pages through `?page=`, which robots.txt disallows, so the items are read from the public Sanity dataset behind the site (Sanity's API CDN, one GROQ query of 100 items a request, newest first); items whose second type is Website (apps and tools) not read; `?ref=nocodesupply.co` dropped; deep links on shared hosts (webflow.io) skipped; industries mapped; keeps the normal quality bar |
| Designer Portfolios (github.com/mejed-alkoutaini/designer-portfolios) | working, a hand-picked GitHub list of about 115 portfolio websites from UI, product, brand and web designers and small studios (Bruno Simon, Dennis Snellenberg, Niccolò Miranda, Stas Bondar, Peter Tarka, Jan Losert), started in 2025 and still added to in 2026; its README read raw in one request, newest rows (the bottom of the list) first, Behance and bento.me profile links skipped, every site tagged Agency & Portfolio |
| Webinspoo | working, read from its sitemap newest first, landing pages only, one page fetched per new site, every site tagged SaaS |
| Astro showcase | working, cards link straight to the site |
| Gatsby showcase | working, read from its sitemap newest first, one page fetched per new site, categories mapped to industry |
| Nuxt showcase | working, one page lists every site, cards link straight to the site |
| Lenis showcase | working, read from its sitemap newest first, one page fetched per new site, partner promos skipped |
| Made with Kirby | working, read from its RSS feed newest first, items link straight to the site |
| WordPress Showcase | working, read from its WordPress API newest first, two requests for the whole gallery, categories and tags mapped to industry |
| Statamic Showcase | working, paged with ?page=, one page fetched per new site |
| MUUUUU.ORG | working, paged with /page/<n>, cards link straight to the site, industry mapped from the detail path |
| Awwwards (Honorable Mentions) | working, same card markup as Sites of the Day |
| Awwwards (Nominees) | working, every site submitted to the jury (about 320 pages, newest first), same card markup as Sites of the Day, winners and Honorable Mentions skipped as already stored |
| CSS Winner (Nominees) | working, every site submitted to CSS Winner (about 1,070 pages of 18, newest first), same card markup as Sites of the Day, winners skipped as already stored |
| Swup showcase | working, about 30 sites its maintainers accept on quality (architecture practices, museums, biennials, studios), read from the swup/docs repository on GitHub (one front-matter file per site) because swup.js.org answers 503 at times, newest first, files already stored skipped |
| Wall of Portfolios | working, read from its sitemap newest first, one portfolio page fetched per new site, every site tagged Agency & Portfolio |
| Mosaic | working, every category page its sitemap lists, cards link straight to the site, category label mapped to industry |
| SaaS UI | working, read from its sitemap newest first, one app page fetched per new site, category mapped to industry, falling back to SaaS |
| CursorUp | working, the four category pages its sitemap lists, then the home page, cards link straight to the site, category mapped to industry |
| 1GUU | working, paged with /page/<n>/ newest first back to page 100 (mid-2020), cards link straight to the site, the operator's own card skipped |
| DesEngs | working, its inspiration page and its portfolios page, cards link straight to the site, portfolios tagged Agency & Portfolio, sponsored cards skipped |
| WP Gallery | working, paged with ?query-1-page=<n> newest first, cards link straight to the site, category mapped to industry |
| Storefolio | working, one page lists every store, only the home page cards are read, cards link straight to the store, category mapped to industry |
| Curate Gallery | working, one page, read from the plain site list the page serves beside its client-rendered cards, category mapped to industry, template entries skipped |
| Browsing Mode | working, its six category pages and three type pages, which together list every site, cards link straight to the site, page mapped to industry |
| Hero Gallery | working, read from its sitemap, one page fetched per new site, subject tags mapped to industry |
| 3D Websites | working, paged with ?page=<n> newest first, cards link straight to the site |
| Mesh3D | working, read from its sitemap, one page fetched per new site, theme (else type) tag mapped to industry, experiments skipped |
| Klikkentheke | working, paged with /catalogue/page/<n>/ newest first, cards link straight to the site |
| Crypto Design Club | working, read from its sitemap, one page fetched per new site, category tag mapped to industry (else Crypto) |
| Choooodoii | working, paged with /page/<n>/ newest first, cards link straight to the site, industry class mapped to industry, recruiting pages and ad cards skipped |
| Shop Site Awards | working, paged with /page/<n>/ newest first, cards link straight to the store, every store E-commerce |
| DesignforB2B | working, one page lists every site, cards link straight to the site, industry tag mapped to industry (else SaaS) |
| ui-design.studio | working, one page lists every site in category sections, cards link straight to the site, section mapped to industry |
| FinPantheon | working, one page lists every site, cards link straight to the site, Crypto or DeFi tags are Crypto, the rest Finance |
| Landing Page Gallery | working, read from its sitemap newest first, one page fetched per new site |
| Just a Design List | working, design studios read from its sitemap newest first, one page fetched per new studio, country mapped to an ISO code, every studio Agency & Portfolio |
| Glance | working, SaaS hero sections read from its sitemap, dated snapshots and A/B variants skipped, one page fetched per new site, category tags mapped to industry (else SaaS) |
| tiny blocks | working, e-commerce stores read from its sitemap's brand pages, one page fetched per new store, fashion and food tags mapped to industry (else E-commerce) |
| Lowww | working, low-carbon sites paged with /page:<n> newest first, cards link straight to the site, the 404 past the last page ends the listing |
| perfolios | working, one page lists every portfolio in its JSON-LD ItemList, no detail page fetched, every site Agency & Portfolio |
| OG Image Gallery | working, paged with ?55263efb_page=<n> newest first, cards link straight to the site, a page that does not link back to the one before it ends the listing |
| Design Details | working, read from its sitemap newest first, one page fetched per new site, Industry category mapped to industry |
| Inspolanding | working, paged with ?page=<n> newest first, site records read from each page's Next.js flight data, no detail page fetched, category mapped to industry (else agency and portfolio types are Agency & Portfolio) |
| Dragdropship | working, every entry read from the JSON its /showcase page serves newest first, one page fetched per new site, first mappable industry tag mapped to industry |
| Sections.wtf | working, section cards on its home page grouped by site newest first, one section page fetched per new site, ad cards skipped |
| Top CSS Gallery | working, Site of the Day archive paged with /page/<n>/ newest first, cards link straight to the site, category mapped to industry, templates skipped |
| BRIK GALLERY | working, paged with ?p=<n> newest first, 120 cards a page link straight to the site, Japanese categories mapped to industry, banner and recruiting cards skipped |
| Good Web Design | working, paged with /webdesign/page/<n> newest first, 24 cards a page link straight to the site, recruiting sites skipped |
| NOOK | working, every /site/<id> page read from its sitemap newest first, one page fetched per new site for its JSON-LD url, industry slug mapped to industry, recruiting sites skipped |
| Brilliant Design Collect | working, paged with /page/<n> newest first, 84 cards a page link straight to the site, recruiting sites skipped, a 404 past the last page ends it |
| デザインのこと (designnokoto) | working, PC list paged with /_____wd_/page/<n> newest first, cards link straight to the site, post id from the quick-look modal kept as the source, closed, sponsored and recruiting cards skipped |
| Korea Web Design | working, read from its WordPress API newest first, eight requests for the whole PC gallery, each post's url field links straight to the site, industry category mapped to industry, recruiting sites skipped |
| Reeoo | working, paged with /website/page/<n>/ newest first, one page fetched per new site, industry pills mapped to industry, a 404 past the last page ends it |
| Arche Directory | working, every /sites/<slug> page read from its sitemap newest first, one page fetched per new site for its JSON-LD url, portfolios mapped to Agency & Portfolio, a landing page's first keyword mapped to industry |
| lowwwcarbon | working, low-carbon sites paged with /showcase/page/<n>/ newest first, cards link straight to the site, an empty page past the last ends it |
| Framer Gallery | working, the gallery home and its 32 category pages (up to 64 sites each in the served HTML), one page fetched per new site for its Visit Site link, category mapped to industry |
| BestSaaSWebDesigns | working, every /site/<slug> page read from its sitemap newest first, one page fetched per new site for its JSON-LD url, category mapped to industry |
| Recent (formerly Godly) | working, Godly's website picks read from its items API newest first, 50 a request, each item's source url links straight to the site, category mapped to industry, posts from X and Instagram skipped |
| Storefront Design | working, one page whose served data lists every store with its outbound link, industry tag mapped to industry |
| Palate | working, one gallery page lists every reference site, one page fetched per new site for its outbound link, vertical mapped to industry |
| UX Portfolios | working, every /portfolios/<slug> page read from its sitemap, one page fetched per new portfolio for its Visit link, every site tagged Agency & Portfolio |
| Osmo showcase | working, one page of about 100 sites, no detail page fetched |
| Made with Wagtail | working, paged with /page/<n> newest first, cards link straight to the site |
| Dark Design | working, one page lists every site, cards link straight to the site, categories mapped to industry, sponsored cards skipped |
| I/O 3000 | working, paged with /page/<n>/ newest first, cards link straight to the site |
| Responsive Web Design JP | working, paged with /page/<n> newest first, cards link straight to the site |
| Ikesai | working, paged with ?p=<n> newest first, cards link straight to the site |
| Gallereee | working, read from its sitemap newest first, one portfolio page fetched per new site, every site tagged Agency & Portfolio |
| The FWA | not adapted: client-rendered; its winner data loads from /api, which robots.txt disallows, and the winners feed carries no site links |
| Land-book, Lapa Ninja, Web Design Inspiration, Saaspo, Maxibestof | not adapted: 403 behind a bot challenge |
| SiteInspire | not adapted: 403/429 to plain requests; its RSS feed (`/websites/feed`, 48 latest) answers, but its items link only to SiteInspire's own detail pages, which sit behind Vercel's bot checkpoint, and robots.txt bars AI crawlers |
| CSS Reel | not adapted: now a casino affiliate page |
| Unsection | not adapted: lists sections, not sites; the site link is only on each section page |
| Supahero | not adapted: hero sections only, now folded into screensdesign.com |
| Made in Webflow | not adapted: no outbound site links in the served HTML |
| CSSMania | not adapted: every site link goes through bit.ly |
| Web Guru Awards | not adapted: now server-rendered, but its winners and nominees are mostly small businesses, tools and personal pages (a drilling contractor, a browser toolbar) |
| bestcss.in | not adapted: mostly agency and local-business submissions |
| Muzli | not adapted: its inspiration is articles and shots, not a list of sites |
| CSS Awards (cssawards.net) | not adapted: the domain is parked |
| UIJar | not adapted: the domain now hosts an unrelated business |
| DesignRush, Web Design Museum | not adapted: 403 behind a bot challenge |
| Websitevice | not adapted: small category pages of mixed quality; robots.txt asks a 10-second crawl delay |
| Minimalissimo | not adapted: features product and interior design, not websites |
| Page Collective | not adapted: app flows and screens, not sites |
| SaaS Websites | not adapted: no outbound site links |
| GSAP showcase | not adapted: a handful of sites in the served HTML |
| Call to Inspiration, Communication Arts Webpicks | not adapted: client-rendered (Communication Arts' Interactive Annual is adapted) |
| Web Design Awards (webdesignawards.io) | not adapted: paid submissions, mostly agencies and local businesses |
| Fonts In Use | not adapted: robots.txt asks a 10-second crawl delay |
| UI UX Showcase | not adapted: mostly design resources and tools, not sites |
| Light Mode Design, SaaS Interface, Super Creative, Made on Tilda, Portfolio Village | not adapted: now a shop, app screens, a studio site, no outbound site links, not a site gallery |
| Looks Like Good Design, Framer Websites | not adapted: creative work of every kind, not websites; an agency site, not a gallery |
| One Page Mania, startups.gallery, Next.js showcase | not adapted: now redirects to an agency site; a startup and jobs directory; only a handful of sites |
| Design Inspiration (design-inspiration.net), Readymag showcase | not adapted: industrial and product design, not websites; the showcase page is gone (404) |
| Shopify examples | not adapted: a handful of stores |
| Three.js showcase, Sanity showcase, Strapi showcases | not adapted: mostly WebGL demos, games and experiments; robots.txt disallows /showcase; mostly small local businesses |
| Craft CMS showcase | not adapted: now redirects to the home page, whose few links are mostly agency case studies |
| ProcessWire sites, Readymag examples, Remix showcase | not adapted: no site links in the served HTML |
| Hugo, Payload, Storyblok, DatoCMS, Directus, Svelte showcases | not adapted: 404 |
| Prismic showcase, Ghost Explore, Site Builder Report, Codrops roundups | not adapted: only a handful of sites in the served HTML; mostly small businesses and affiliate links; 403 behind a bot challenge |
| Webby Awards winners, Made with Vue.js, Made with React, Made with Laravel, Klim In Use | not adapted: client-rendered; mostly apps and side projects; mostly print work |
| Barba.js showcase | not adapted: read from Firestore behind an encrypted client key |
| Wix Studio inspiration | not adapted: no site links in the served HTML |
| Design Made in Germany | not adapted: a design blog and agency directory, not a site gallery |
| wagtail.org showcase, Design Inspiration | not adapted: a few case studies (Made with Wagtail is its site list); product design, not websites |
| Drupal case studies | not adapted: robots.txt asks a 10s crawl delay |
| Cargo examples, Webflow, Builder.io, Concrete CMS, Contao showcases | not adapted: 404 |
| Elementor and Bricks showcases | not adapted: no site links in the served HTML |
| October CMS, Grav, Jamstack, Neos, TYPO3, Umbraco showcases | not adapted: 404 |
| GDWEB, Webzooo, Bookma!, The Whimsical Web, A Fresh Website, Good Cart | not adapted: robots.txt disallows every crawler; now a reading app; a small webring of personal pages; behind Vercel's bot checkpoint |
| Minimal Sites, LP-web, Lately, design.fish, Inspiration Supply | not adapted: dormant since about 2011; campaign landing pages deep inside corporate sites; interaction clips on X, not sites; no site links in the served HTML |
| Awwwards (Developer Award, Sites of the Month), landingpage.fyi, CTA Examples | not adapted: nearly every entry is already a Site of the Day; affiliate tool links and CTA section clips, not a list of sites |
| Craftwork inspiration, Saved, Webpo, Websites on Display | not adapted: mirrors Curated's entries and images; no site links in the served HTML |
| Straightline bookmark, RDLP LP Archive, Inspirationde | not adapted: 403 behind a bot challenge |
| stunning.design, regards.design, Memorables, curateDB | not adapted: no site links in the served HTML; a directory of design resources, not sites |
| Japan Web Design Gallery, Rebrand Gallery, Startup Inspire, CSS Luxury, Design Spells | not adapted: robots.txt asks a 10s crawl delay; brand identities, not websites; 403 behind a bot challenge; 429 |
| Framer Awards, Best Designs On X, delights.design, Inspiration Index, save.design, Inspo MCP, swaggin, Step1 gallery | not adapted: about 25 winners a year; posts on X, not sites; 403 behind a bot challenge; no site links in the served HTML |
| refs.gallery, Deslove, The Index, Awesome Marketing Websites | not adapted: behind Vercel's bot checkpoint; mostly Dribbble and Behance shots, not sites; studio pages link to Instagram, not the studio's site; only the featured site in the served HTML |
| Load More, Exhibita, coolest.design, Landdding | not adapted: robots.txt asks a 10s crawl delay; mirrors Awwwards' entries; mostly UI components and experiments; open submissions, many small businesses |
| Brutal Web, movin.design, Inspora, OKAY DEV, The Colophon | not adapted: entries link to Are.na; motion components, not sites; posts and creators, not sites; a community of articles and profiles; no site links in the served HTML |
| Prettyfolio, foliofolio, Visual Journal, Web3Inspiration | not adapted: the domain now serves gambling spam; a parked domain; brand identity projects linking to their designers, not sites; 32 sites, no new entries since January 2025 |
| CreateToday examples, Web Design Garden, Gendai Design | not adapted: 403 behind a bot challenge, mostly small businesses; many recruiting and campaign subpages of corporate sites; no new entries since August 2023 |
| Best Web Gallery, CSS Crème showcase, Uncommon Gallery, Foxora Showcase | not adapted: no new entries since 2016; behind Vercel's bot checkpoint; the domain now redirects to a parked lander; a registry of rebuild prompts, about 100 references |
| DTC Patterns, Awwwesome, Designeer Recent Design, aiwebsites.design, saasy.design | not adapted: brand pages carry no outbound site links; about 18 sites, ignores paging, no new entries since September 2025; 403 behind a bot challenge; a domain for sale; a parked lander |
| CSS Remix, Unicorn Studio showcase, The Inspiration, PagesThatPrint, steep.design | not adapted: now a page of CSS links; client-rendered; design articles of every kind, not websites; indie SaaS submissions, mostly launch-directory badges; no site links in the served HTML |
| Supercharge Design, Interface Index, WeLoveWP, dbcut, Websites That Convert | not adapted: a UI course whose site list is mostly corporate home pages; B2B interface elements, not sites; 403 behind a bot challenge; 403 behind a bot challenge; no site links in the served HTML |
| Commerce Cream, SITEJOY, oolala.space, siteu.io, BuildinFramer | not adapted: the domain no longer resolves; a domain for sale; client-rendered, a handful of sites in the served HTML; client-rendered, no sitemap; the domain does not resolve |
| posts.design, Social Proof Examples, UI Bits, PFolios, Speedlify Eleventy community | not adapted: no site links in the served HTML; video clips of testimonials, not sites; a newsletter; client-rendered, "available soon"; mostly developer blogs |
| Coherent Design, Web Design Pub | not adapted: app UI screens, not sites; the domain does not resolve |
| WebCurate, Inspiration UI, HyperFramer, Calltoidea, LandingPicks | not adapted: a directory of useful sites and tools, not a design gallery; no new entries in years; Framer templates; UI elements, not sites; client-rendered |
| Stash, ListOfWebsites, Browse.Cool, wwwtf.site, Insposite, Motion Sites | not adapted: a directory of tools, foundries and studios; an SEO directory whose counts contradict themselves; no site links in the served HTML; a handful of sites in the served HTML; 403 behind a bot challenge |
| Kage, Landing Pages Explained, collected.li, ARTNOC, .SG_BOOKMARK, webportfolios.dev | not adapted: mostly Product Hunt launches and app screens; copywriting teardowns of indie products; eight random sites a visit; the domains do not respond; 402 |
| Inspirectory, mkdir.directory, LDS Library, personalsit.es | not adapted: directories of galleries, not sites; Dribbble and Behance shots; mostly developer blogs |
| Rick Creates, Adfolio | not adapted: mirrors FWA and Awwwards entries; behind Vercel's bot checkpoint |
| Global Web Design Awards, Web Dev Awards, CSS Awards (cssawards.org), WD Awards, Designs Creme, dailyweb.design | not adapted: mirrors Awwwards' entries and logos; 403 behind a bot challenge; no site links in the served HTML; a parked lander |
| MegaMegaTypeType, Vev showcase, Eyecandy, studiodirectory.co | not adapted: links to single typeface pages, not foundry sites; 404; 403 behind a bot challenge; a GoDaddy placeholder |
| Mega Awwards, umanmade, on.design, Scrolltide, Me, But Online, UI Coach, The Vellum, Personal Site Gallery | not adapted: mostly paid submissions from small local businesses; shots, templates and prompts, not sites; no new entries since May 2023; 402; a handful of sample projects; tens of thousands of mostly developer blogs |
| Photo Web Designs, Aura++ | not adapted: a web design agency for photographers, not a gallery; a startup launch directory |
| Headers Club, before.click, abtest.design, Clonify, Repaint, Selected Screens, The UI Index | not adapted: behind a Vercel login; App Store screenshots and A/B test results, not sites; a Framer template library; website examples from small local businesses; robots.txt bars AI crawlers |
| WPMade, curated.cool, Kombai Gallery, Musterlab, Inspoweb, Pure Sites, styleguide.fyi | not adapted: mostly small local businesses; a dormant link list; generated UI designs, not sites; deployment disabled; behind Vercel's bot checkpoint; a coding style guide |
| Motion Folios, Leadership Folios, Webfolios, umeboshi, Startup Web Designs, D1S1 | not adapted: client-rendered; about 40 design leaders' sites, mostly writing; about 60 portfolios, nothing new since January 2025; mostly Japanese corporate and small local business sites; the domain now serves gambling spam; behind Vercel's bot checkpoint |
| Shops.Gallery, WhatPixel, H1 Gallery, Inspireca, Chamjo, UI Land | not adapted: an alphabetical archive of about 3,500 ordinary Shopify stores; roundups of small local business sites; startup headlines, not site design; app screens and UI resources, not sites |
| website-inspiration.com, SQSP Weekly, Wix Studio inspiration, Landify, Framify, saaslandings.com, UX Collective, Super/Feather/Typedream showcases, Dutch Digital Design | not adapted: about 250 sites, mostly small local businesses; no site links in the served HTML; UI kits, not galleries; a parked lander; nine sites; mostly Notion-built pages; a single welcome post |
| Single-Serving Sites, VICE Awards, Case Study Club, Design Directory, Collecta, Curation of Curations | not adapted: robots.txt bars AI crawlers; about 50 Site of the Day winners, mostly personal portfolios; a newsletter of articles; design tools and schools, not sites; a bookmarking app; a directory of galleries and blogs, not sites |
| Red Dot (Brands & Communication), iF Design Award, dotCOMM Awards | not adapted: robots.txt bars AI crawlers; 403 behind a bot challenge; 403 behind a bot challenge |
| The Davey Awards | not adapted: its Gold website winners are mostly small local businesses and law offices |
| Vega Digital Awards, UX Design Awards | not adapted: robots.txt bars AI crawlers; product and service UX, not websites |
| Indigo Design Award, Interactive Media Awards, Clio Awards | not adapted: robots.txt disallows every crawler; the domain does not respond; robots.txt asks a 10s crawl delay |
| D&AD, The One Show, ADC Awards | not adapted: robots.txt disallows the /search/ its archive is read from; oneclub.org's robots.txt disallows every crawler |
| Best Design Awards (NZ), Deutscher Digital Award, Swiss Typefaces and Pangram Pangram in use | not adapted: winners' pages carry no site links; mostly ad campaigns, not sites; mostly print |
| Information is Beautiful Awards | not adapted: data visualisations, mostly articles deep inside news sites |
| A' Design Award, Golden Pin Design Award, ADC Europe | not adapted: winner pages carry no site links; mostly products and print, links go to designers' Behance pages; projects link only the entrant agency's site |
| i-Award Korea, Danish Digital Award, Australian Web Awards, AGDA Awards, Netty Awards, Svenska Designpriset, Hydrogen showcase | not adapted: robots.txt bars AI crawlers; mostly apps and marketing results, not sites; robots.txt asks a 10s crawl delay (all three); client-rendered; about 15 stores |
| Core77 Design Awards | not adapted: robots.txt bars AI crawlers |
| ADC Deutschland, New York Festivals, Kyoorius, WebTop100, Premios CLAP, Dutch Design Awards | not adapted: its archive is news posts; robots.txt bars AI crawlers (both); about six websites a year, judged on UX and marketing; winner pages link only the designer, ended in 2025; design of every kind, few websites |
| Vuoden Huiput, Good Design Award Japan, Laus, Tina, Qwik and Cosmic showcases | not adapted: digital winners link case films and prototypes, about four a year; client-rendered, mostly products, 429; project pages link only the entrant studio; mostly developer side projects |
| Netko, Golden Site, Workspace Digital Awards, Spider Awards, Icelandic Web Awards, Zlatý středník | not adapted: project pages answer 500 and the winners list carries no site links; client-rendered behind its API's credentials; nominees are agencies, linked through /redirect/, which robots.txt disallows; two website winners a year, no site links; no winners list; corporate communications, not websites |
| Guldägget, Loeries, Kuldmuna, Dutch Interactive Awards, Jekyll showcase, Squarespace examples | not adapted: advertising campaigns whose archive entries carry no site links (all three); its winners page is gone; about 50 mostly developer sites; no site links in the served HTML |
| Shopware, Swell and Shopify Plus customers | not adapted: case-study pages with no store links in the served HTML (all three) |
| Relume showcase, Showit showcase | not adapted: mostly small local businesses and webflow.io staging links; robots.txt asks a 10s crawl delay |
| Design Nominees' and CSS Light's full submission lists, MUSE Design Awards, Are.na website-inspiration channels, Web Design File, Rating Runeta | not adapted: mostly small agencies and local businesses (both, one network); robots.txt bars AI crawlers (both); no new entries since about 2017; an agency ranking whose paging robots.txt disallows |
| CSS Design Awards nominees, Stock Design, AGT smartphone design gallery, matome, PixiJS, Medusa and PrestaShop showcases | not adapted: the same entries as its website gallery, which is already adapted and reaches further back; mostly law, dental and salon sites; mostly Japanese corporate and small local business sites (both); mostly games and demos; no site links in the served HTML (both) |
| Webグランプリ (Web Grand Prix, award.dmi.jaa.or.jp), Gulltaggen, the in-use pages of ABC Dinamo, Grilli Type, Displaay, Commercial Type, Colophon, F37, Production Type and Optimo | not adapted: about 240 winners since 2013, more than half of them campaign and recruiting pages deep inside large corporate sites; a handful of websites a year among advertising campaigns; 404 |
| The FWA (sitemap, legacy archive), Plasmic, Keystatic, GraphCommerce, TresJS and Threlte showcases, Vev showcase, Component Gallery, ui-feed | not adapted: the sitemap lists only the ~38 latest winners, whose pages render from /api, and the legacy archive hides every outbound link on purpose; about 30, 10 and 25 sites mixed with demos and small retailers, mostly demos (both); no site links in the served HTML; design-system docs, mostly subdomains of sites already stored; live components, not sites |
| Prémios Lusos, Web Excellence Awards, Digital Design Awards (digitaldesignawards.com) | not adapted: the domain now serves a Chinese video site; a parked domain; now redirects to the World Business Awards |
| Epica Awards, Graphis, Type Directors Club, The Drum Awards, Motion and Rive showcases, Typotheque and Fontwerk in-use pages, Sharp Type in use, HKDA Global Design Awards, CCA Venus, Annual Multimedia, Joseph Binder Award, Creative Circle | not adapted: 403 behind a bot challenge (the first four); 404 (the showcases and in-use pages); 429; the domains do not respond (the last five) |
| Shopify Theme Store examples, ADCC Awards, Golden Drum, Dexigner, Love the Work (Cannes Lions), It's Nice That, Brand Impact Awards, lookup.design, Landingly | not adapted: each theme page names up to five stores, but a sample of ten themes gave mostly small ordinary shops; robots.txt asks a 60s, 30s and 60s crawl delay (the next three); robots.txt bars AI crawlers; articles about creative work of every kind, not a site list; branding projects reported in articles; client-rendered (both) |
| GDUSA American Web Design Awards, Museum of the Human Web, Liquid Glass Design, Pixelfika | not adapted: no winners since 2021 and its gallery is behind Vercel's bot checkpoint; computing artifacts, not sites; UI shots and prompts, not sites; client-rendered |
| Zlatý klinec, changelog.gallery, sites.gallery, scroll.gallery, startup.gallery | not adapted: Slovak advertising awards whose archive lists campaigns, not sites; changelog posts, not sites; links to other galleries and shot sites, not to sites; design resources, not sites; no site links in the served HTML |
| Prix Numix, Shaheer Malik's examples | not adapted: Quebec's digital creativity awards, mostly installations, podcasts, series and XR, few websites; a freelancer's lists of about eight famous sites each |
| Internetics, Ermis Awards, Adwards, Lápiz de Acero, SND Best of Digital Design, Schick Toikka in use, Babylon.js community | not adapted: Romanian, Greek and Baltic advertising awards whose winners are campaigns, videos and social posts (all three); Colombia's design awards list about ten website winners with no link to the site; results live in Airtable; client-rendered; WebGL demos, not sites |
| SaaS Examples (divbyzero), Made with Lovable, BX Museum, Identity Designed, IAB SA Bookmark Awards | not adapted: SaaS app screens and emails, not sites; vibe-coded side projects; brand stories with no site links; branding case studies; winners published only as PDFs |
| Awwwards collections, Media Queries, Viewport Gallery, Best Product Sites, Big Cartel examples, Top Design King, CSS Based, CSS Loggia, CSS Websites NL, dsgnlv, Strange Fruits | not adapted: drawn from the same jury submissions Awwwards Nominees reads; the domain now holds an unrelated placeholder; its API answers a database error; times out; about a dozen shops; mostly AI tools and utility sites; the last five no longer resolve |
| Studio Showcase, STUDIO customer stories, ICONIC AWARDS, ICAD, Grafika, Flat Design (fltdsgn.com), Hoverstate | not adapted: about 2,450 reviewed submissions, mostly small local businesses and offices (its editors' monthly picks are adapted); about 60 corporate case studies; architecture and interiors, not websites; robots.txt asks a 10s crawl delay; its archive (concours.infopresse.com) bars AI crawlers and answers 403; one post linked from its served home page; the domain does not resolve |
| Bulma expo, The Inspiration Grid, Web Creme, CSS Elite, .eu Web Awards, The Best Designs, CSS Drive, CSS Flavor, Agency Inspired | not adapted: a few dozen framework sites; its web design category answers 404; redirects to CSS Mania; redirects to the GraphCommerce gallery; about 25 finalists a year, judged on the .eu domain rather than design; the last four no longer resolve |
| 10 Best Design, eCommerce Showcase, The Drum Roses Awards, Styleboost, Best Design Korea, iiimg, dbdic, 68design | not adapted: a ranking of agencies, not sites; an archived copy from 2019; advertising campaigns; down for maintenance; design of every kind, few websites; the next two answer 503 or do not respond; behind a captcha |
| Go Good Site, Uneed, Screenlane, Hyperpixel, Designspiration, Boring Websites | not adapted: the domain does not respond; a launch directory of tools, not a design gallery; redirects to Page Flows, which answers 403; the domain now redirects to an unrelated site; 403 behind a bot challenge; three site links in the served HTML |
| Pixlpin, Detail (detail.design), Details Matter, Viewport UI, Varchive, CSS Gallery (cssrefresh.com), Modulesss, Joomla Showcase | not adapted: blocked by a Cloudflare challenge, and app and UI screenshots rather than sites; small interface decisions, not sites; micro-interactions in a single Framer page; UI shots from designers on X; AI news, not a gallery; 14 entries, most of them google.com, yahoo.com and placeholders; parts cut from sites rather than whole sites; community-submitted Joomla sites, not picked for design |
| Web Design Inspiration (webdesign-inspiration.com), TCD Museum, Dezeen Awards | not adapted: 403 behind a bot challenge, its sitemap too; sites built on one vendor's WordPress themes, mostly small Japanese businesses; architecture, interiors and products, no website category |
| Abduzeedo, Scottish Design Awards, The Design Inspiration, Speckyboy, BIMA Awards, Docusaurus showcase | not adapted: robots.txt bars AI crawlers (both); its websites category stops in 2018 with empty post bodies, and the blog now carries pharmacy spam; scattered listicles, not a series; agencies and campaigns announced in news posts; documentation sites |
| Needle Engine showcase, Dark Mode List, Webby Design, Web Design Rankings, Mass-Driver in use | not adapted: now redirects to the home page; apps and tools with a dark mode, not picked for design; an agency site; an agency directory; the page is gone (404) |
| getdesign.ai, 4db | not adapted: about 45 sites, mostly reposted from Recent and X; no new entries since 2014 |
| Tessory | not adapted: its about 1,000 websites mirror Awwwards, Hover States, Recent and Codrops, all read already |
| Made With Astro (madewithastro.co), Flowing Page, Sombra, swiped., What Ships, GreatStuff.fyi | not adapted: mostly small local businesses and test pages; the domain does not resolve; a gradient tool, a design content feed, launch videos from X and a bookmark list, not site galleries |
| LP advance, Real Estate Design Gallery, Selected Site | not adapted: campaign landing pages deep inside corporate sites; condominium sales sites, nothing new since 2021; now a link-in-bio builder's promo page, not a gallery |
| Best Restaurant Websites, lovely ui | not adapted: serves nothing; UI snippets, not a site gallery |
| Bootstrap Expo, Made with Angular, Aceternity UI and Chakra UI showcases, Brands in Motion, Identik, UI Garage, Nicelydone | not adapted: about 10 sites, nothing new since 2019; mostly corporate apps; indie AI tools and product apps built on the library; motion branding projects, robots.txt bars AI crawlers; branding case studies; closed; app screens behind an account |
| Hermes Creative Awards, Webflow Awards, Made in Webflow API, Made with Svelte, Best CSS Gallery, Designflavr, CSS Pick, The Gallery (thegallery.design), unseen.design | not adapted: winners load client-side and are mostly marketing collateral; about 30 winners and finalists a year, mixed with agencies, partners and people; community cloneables and templates; mostly apps and side projects; now casino spam; a link page to other galleries; an empty placeholder; an empty WordPress install; a parked lander |
| Framer Experts, TinaCMS showcase, designsystems.surf, Trend List, Webframe, Webstar Festival, Premio iBest, Křišťálová Lupa, webawards.ie | not adapted: about 100 partners in the served HTML, mostly small marketing agencies; about 20 sites; design-system docs; graphic design images, not sites; archived; the domain now hosts an article farm; popularity awards for brands and services, not design (both); parked |
| Motion Folios, Leadership Folios, AI Website Gallery, Launchscene, Pixelvault, Fontshare and Future Fonts in-use pages, Velvetyne in use, other foundries' in-use pages, Breakdance, Netlify, Duda and Theatre.js showcases | not adapted: client-rendered, its lists load from the Divhunt API; about 35 portfolios of design leaders; sites made with AI builders, mostly small German local businesses; product launch videos, not sites; 403 behind a bot challenge; client-rendered (both); redirects to a single post; 404 (Lineto, 205TF, Collletttivo, Dharma Type, Atipo, Newglyph, Ohno, Letters from Sweden, Tightype); 404 (all four) |
| Best Design Awards (New Zealand), Owwly, CloneAny gallery, AIGA Design Archives, RGD Awards, LeadAwards, Made With GSAP, Tokyo Interactive Ad Awards, ADC*E | not adapted: robots.txt bars AI crawlers; robots.txt disallows /feed; clones of CloneAny's own demo pages; 403 behind a bot challenge; branding and in-house categories, no websites; no edition since 2019; JavaScript effects, not sites; the domains do not respond (both) |
| HUMANS (humans.fyi), freshdesign.io | not adapted: the domain does not resolve; serves an empty page |
| Design Sphere (designsphere.xyz), PageInspo, Design Excellence Awards (webdesignawards.co), onlyfolios.com, websites.fyi | not adapted: a client-rendered shell of "design narratives"; UI patterns, no site links in the HTML; a Base44 app with no site links; a GoDaddy builder page; an empty page |
| The Headless Club, Branding Website, WonderList, The Animated Web, nextjs.design, LandingHero, CSSDSGN, Well Designed Sites, W3design, Showcase Supply, Fonts in the Wild | not adapted: about 125 headless commerce stores, no new entries since November 2023; brand identity projects, not sites; Figma website templates; CodePen demos and animation posts, nothing new since 2021; a directory of Next.js dev tools; a handful of links; the domain does not respond; the last four 403 behind a bot challenge |
| SiteThis, Web Awards UA (webawards.com.ua), webdesign.org Site of the Day, Readymag portfolio page, creative-portfolios (iRaul), taste-index | not adapted: robots.txt bars AI crawlers; a national contest of entrant-submitted sites, mostly local companies and shops; empty archive pages; images only, no site links; down to 12 sites, its full list frozen since 2019; a list of galleries already read |
| URAGAWA, WebAnatomy best landing pages, Scaling DevTools landing pages, ThemesMotion Best Sites, awesome-web-prompts, awwweasome-websites | not adapted: still 401, its new domain redirects to the old address; an SEO agency's conversion scores, no outbound site links; robots.txt bars AI crawlers; a template shop, client-rendered; AI prompts, not sites; about 100 links mostly reposted from other galleries, last added to in March 2025 |
| Flowradar Webflow inspiration, Flowout best Webflow websites, Hoverstate (hoverstate.design) | not adapted: about 85 sites behind its own redirect links; no site links in the served HTML; the domain still does not resolve |
| UIZZE, Gummble, Flownato, gallery.design, webdesignawards.net | not adapted: app screens and flows, not websites (all three); a kitchen showroom; a landing page for the A' Design Award |
| Nikolai Bain examples, Colorlib "best websites" posts, Best Websites Around the World, Cssfox, Vetted Design (Flat Trendz), Website Awards, djangosites.org | not adapted: a freelancer's B2B SaaS page examples, about 80 distinct sites; a theme vendor's listicles of mostly small local businesses; nominees mostly small businesses; no new entries since 2024; dormant; 403 behind a bot challenge (both) |
| Developer Portfolios (emmabostian), MadeWithVibe, VisualPH | not adapted: about 2,100 portfolios added by open pull request with no editorial pick, mostly students' vercel.app and github.io pages; vibe-coded apps, not picked for design; the domain does not resolve |
| Webguru Awards, CSS Reel, awesome-personal-websites (logancyang), awesome-dev-websites (christopherkade), awesome-landing-page (nordicgiant2), awesome-vibe-coding-websites | not adapted: about 4,700 paid submissions, about 4,400 of them listed as winners with jury scores near 8 for nearly all; robots.txt bars ClaudeBot and anthropic-ai, and the home page links casinos; dormant since 2020; dormant since 2021; page templates, not sites; AI-generated templates |
| SoDA awards, Webby Awards winners sitemap, Squarestash, Alvaro Trigo's blog, NAVS | not adapted: robots.txt bars ClaudeBot and anthropic-ai; people's profile pages only, the winners galleries render client-side; listicles; fullPage.js demos; now a directory of AI tools |
| Bricks showcase (REST API), The Gallery (REST API), Super showcase, Webcreme, darkmodelist.com | not adapted: its entries and site links come from WordPress's REST API (`/wp-json/wp/v2/website`) and detail pages, but they are mostly small local businesses; 31 projects, mostly marketing activations; Notion-built pages; now redirects to CSSMania; a handful of AI tool links |
| ThemesMotion Best Sites, CSS Revue, Hezké Weby, SkvěléStránky | not adapted: about 30 sites, robots.txt bars ClaudeBot and anthropic-ai; about 580 Czech sites, nearly all added around 2010; an agency's blog of roundups, not a gallery; the domain does not resolve |
| BAKUup, LADAWARDS, Modern Websites, Docodoor's link collection, aifer.jp, detail.design, art-directed.com, SvelteKit and Spline showcases | not adapted: about 1,530 Japanese picks, mostly corporate, recruiting and small local business sites, about six new entries since mid-2025; a client-rendered winners gallery across every discipline with two small website categories; a UK agency; a Japanese agency's partner links; 403; interface details with a handful of outbound links; a product imagery service; redirects to svelte.dev's home page and 404 |
| WebsiteAwards.es, Codrops, webjangi.com, designrefs.com, designus.io, LP幹事, Kopf und Stift's 50 schönste Webseiten, Frontend Horse, GSAP showcase | not adapted: robots.txt bars ClaudeBot and GPTBot; its feed answers but robots.txt bars ClaudeBot and anthropic-ai and its pages answer 403; mostly Korean corporate, university and public-sector sites; robots.txt bars AI crawlers; does not respond; an agency-matching service; one designer's list of about 50, mostly trades, law firms and practices; articles on creative techniques, not a site list; still a handful of sites in the served HTML |
| frames.gallery, LandingPicks, siteu.io, Astonishing Awards, oolala.space, Call to Inspiration | not adapted: a thesis project of a few dozen picks, many of them app screens; its `/api/getPosts` answers 503; no site links in the served HTML; still client-rendered; a handful of landing pages; UI components, not sites |
| Brave Search | working; skipped with a notice when `BRAVE_API_KEY` is unset |

### Accelerator portfolios

Three discovery adapters read accelerator portfolios instead of design galleries
and queue the websites of their **2025 and 2026 cohort** companies, through the
same opt-out, robots.txt and dedupe checks as every gallery. Each company's
page on the accelerator's site is its `sourceRef`, so later runs skip it.

| Adapter | Program | Source |
|---|---|---|
| `techstars` | Techstars | the portfolio page's Typesense search (search-only key from `/api/search/config/companies`); cohort year is `first_session_year`, batch the program name |
| `finc` | Founders Inc | `/portfolio/<slug>/` pages from f.inc's sitemap; f.inc publishes no cohorts, so the whole portfolio (about 205 companies) is read, and skipped if it ever passes 400 |
| `speedrun` | a16z speedrun | `/companies?cohort=SRxxx` and each `/companies/<slug>` page for the website; years from a16z's own posts (SR004–SR005 2025, SR006–SR007 2026) and, for new cohorts, speedrun's FAQ |

```sh
npm run discover -- --only speedrun --limit 50   # queue one program's companies
npm run accelerators -- --window                 # dry run, no database: 2025–2026 counts and samples
npm run accelerators -- --only techstars         # every cohort, as the badge sync uses it
```

The fetchers live in `pipeline/accelerators/<id>.js` (`companies()` returns every
cohort as `{ name, website, batch, year, companyUrl, oneLiner, industryHint }`)
and the program ids and names in `lib/taxonomy.js` `ACCELERATORS`. Only company
websites enter the pipeline; logos and other images are never read.

## Capture a site

The capture engine drives a local headless Chromium through Playwright. Install
the browser once (about 150 MB):

```sh
npx playwright install chromium
npm run capture -- https://example.com              # home page only
npm run capture -- https://example.com --subpages   # plus up to 8 internal pages
npm run capture -- https://example.com --headed     # watch the browser
```

Each page is shot at desktop (1440) and mobile (390) widths. Images land in
the private Vercel Blob store under `shots/<siteId>/` (or `data/shots/<siteId>/`
when `BLOB_READ_WRITE_TOKEN` is unset) as WebP: `<page>-<platform>-full.webp` (the whole page,
capped at 12000 css px), `-lg` and `-sm` top-of-page thumbnails, and
`sections/<sectionId>{,-sm}.webp` crops. Every screen and section also gets
agent images, the only pictures the agent API hands out: `-agent.webp`,
`-agent-2.webp`, … tiles at most 1536 tall, 1024 wide on desktop and 585 on
mobile, cut top-down. Rows go into `pages`, `screens`, `sections` and
`agent_images`. Opted-out domains and URLs disallowed by robots.txt are skipped and
logged in `events`.

### Clean up wrapped captures (backfill)

Chromium draws at most 8192 device px per screenshot and repeats the page from
the top past that, so long pages captured before capture switched to tiles
(desktop past 4096 css px, mobile past ~2731) list Hero, Logo cloud and so on
more than once. `npm run dedupe-sections` finds and fixes them:

- It walks every page captured before the run started, oldest first. It downloads
  the full image only for screens tall enough to wrap (about 4096 stored px on both
  platforms) and checks it at exactly the Chromium period (`pipeline/dedupe.js`).
- A wrapped page of a public site is **captured again** (both platforms, the
  fixed capture), and the site keeps its status. If that fails, or the site is
  not public or disallowed by robots.txt, the page is cleaned up instead
  (nothing is written for opted-out domains): the full image is cut at the period (stored under a new name), its
  agent tiles rebuilt, sections at or past the period deleted and the one across
  it cut short.
- On every screen, a section that is near-identical to an earlier one
  (`sectionHash`) is deleted, together with its images, agent tiles and embedding.
- Each fixed page gets a `dedupe_backfill` event, and the run ends with totals.
  It is safe to stop (Ctrl-C finishes the current page) and run again: a rerun
  changes nothing, but it reads every section image again (each run downloads
  the whole library from Blob, in the dry run too).

```sh
npm run dedupe-sections                     # dry run: what it would change, and totals
npm run dedupe-sections -- --site <siteId>  # one site
npm run dedupe-sections -- --apply          # make the changes
```

Against production: run `vercel env pull` so `.env.local` has `DATABASE_URL`
and `BLOB_READ_WRITE_TOKEN`, install Chromium (`npx playwright install chromium`),
then start with the dry run and read its totals before `--apply`. Without
`BLOB_READ_WRITE_TOKEN`, shots are read from and written to `data/shots`.
`--apply` refuses to run unless a random sample of the database's full images are all there (the shared
database keeps them in Blob), because recaptured rows would point at files only
your disk has. Recaptures use the normal polite capture (one page load per
domain per second), so a large backlog takes a while. `--site` lets you try a
single site first.

## Judge and tag

Claude vision decides which captured sites make it into Sqrap. Judging sends
only the two home-page folds (the desktop and mobile `-lg` thumbnails) with the
domain and page title, and gets back a 1–10 quality score with per-dimension
scores and reasons, plus a name, an original tagline and description, an
industry, a country and a language. A site scoring at least
`SQRAP_MIN_QUALITY` (default 7) becomes `approved`, anything lower `rejected`.
Sites discovered from a hand-curated design gallery, where a jury, editor or
curator picked each site for its design, are approved at the lower
`SQRAP_MIN_QUALITY_CURATED` (default 6, never above `SQRAP_MIN_QUALITY`),
since the score there mostly second-guesses that pick. The list is
`CURATED_SOURCES` in `pipeline/discover/curated-sources.js`, by adapter name
(`sites.source`): design awards and Sites of the Day, and galleries of sites,
stores and portfolios hand-picked for design. Nominee lists, platform
showcases, section and screen libraries, studio and foundry directories,
the accelerators, search and `manual` sites keep the normal bar, as does a
site with no or an unknown source. A site found by several sources is judged
by its first one. The bar used is stored as `min_quality` in `quality_notes`.
The judge still runs for every source: it also catches bad captures and
writes the name, description, industry and country.
A capture that does not show the real site (blank, error page, bot challenge,
a cookie wall over most of the fold) becomes `failed` with
`last_error='bad_capture'` so it can be captured again. Approved sites are then
styled and tagged: the site gets 1 or 2 visual styles (minimal, editorial,
brutalist, …: `STYLES`), each page a page pattern and every section crop a
section type, all from `lib/taxonomy.js`.

A judge call that fails (the API refused it, a timeout, no credits) leaves the
site `captured`, so a later run retries it, and sets
`last_error='judge_error: <status|-> <message>'`. The operator API and the admin
show it, and the next successful judge clears it. A 401/402/403 also switches
the judge off for the rest of the run; the run totals count `judged`,
`judgeErrors` and `judgeRefused` (the status, or null). The cron response adds
`judge: { enabled, lastJudgedAt, waiting, lastError, lastErrorAt, stalled }`.
The judge counts as stalled when sites wait in `captured` and none was judged for
6 hours (`judgeHealth` in `lib/db.js`). A stalled judge logs
`JUDGE STALLED: …` from the cron route (search the function logs for it) and
shows a warning at the top of `/admin`.

Styles come from a call of their own (`styleSite`, `STYLE_SCHEMA`) that sees the
same two home folds and writes only `sites.style`, `styled_at` and
`style_attempts` (migration `010`), never status, quality, name or description,
so styling an approved site can never reject it. The pipeline styles a site
right after approving it. Sites without a style (approved before styles
existed, or whose style call failed) get one from `npm run judge -- --style-only`
or from the cron route, which styles up to 8 per run; a site whose answer is
outside `STYLES` 3 times is left alone.

```sh
npm run judge -- stripe.com                    # judge one site (id or domain), tag it if approved
npm run judge -- --dry-run stripe.com          # print the judgement as JSON, write nothing
npm run judge -- --all-captured --limit 15     # every site with status 'captured'
npm run judge -- --retag <siteId|domain>       # re-run tagging only
npm run judge -- --style-only                  # style every public site without a style (--limit N)
npm run judge -- --style-only stripe.com --dry-run  # print a site's styles, write nothing
npm run style:calibrate                        # agreement with the hand-labelled sites
```

`pipeline/judge/style-calibration.json` holds 30 hand-labelled sites (1 or 2
styles each). `npm run style:calibrate` runs the style call on those in the
library without writing anything and prints, per site and overall, how often
the model's first style is one of the labels, how often they share any style,
how often the sets are the same, and precision and recall per style
(`-- --json <file>` saves it). Sites not in the library are listed as skipped.

Calls go through Vercel AI Gateway, authenticated by `AI_GATEWAY_API_KEY` or
the Vercel OIDC token (automatic on Vercel; `vercel env pull` puts a 12-hour
one in `.env.local`). A set `ANTHROPIC_API_KEY` calls Anthropic directly
instead. With none of these the CLI exits 1. `SQRAP_JUDGE_MODEL` picks the
model (default `claude-sonnet-5-5`, sent to the gateway as
`anthropic/claude-sonnet-5.5`). Token use and an estimated cost
are printed as it runs and logged in `events`. To re-judge a site, set its
status back to `captured`.

## Run the whole pipeline

`npm run pipeline` takes sites through discovered → captured (home page) →
judged → (if approved) subpages captured → tagged, three sites at a time and
one page at a time per domain. Postgres is the queue: each site is claimed with
one atomic update, so a crashed or overlapping run never processes a site
twice, and the next run picks up where the last one stopped.

```sh
npm run pipeline -- --discover --limit 50     # discover first, then advance up to 50 sites
npm run pipeline -- --limit 10 --max-judge 20 # no discovery, at most 20 AI calls
npm run pipeline -- --dry-run                 # show what is waiting, change nothing
npm run pipeline -- --watch 6h                # run again every 6 hours until Ctrl-C
npm run pipeline:status                       # sites per status and the last 10 errors
```

| Flag | Default | |
| --- | --- | --- |
| `--discover` | off | run discovery before claiming sites |
| `--sources` | `galleries,search` | discovery sources (`galleries`, `search`, `seeds`) |
| `--discover-limit` | 200 | new sites discovery adds |
| `--limit` | 25 | sites advanced this run |
| `--concurrency` | 3 | sites in parallel |
| `--max-judge` | 100 | AI calls (judge, style and tag) this run |
| `--recapture-older-than` | off | re-queue approved sites captured longer ago, e.g. `90d` |
| `--retry-failed` | off | re-queue failed sites with fewer than 3 attempts |
| `--prune-rejected` | off | delete a rejected site's screenshots |
| `--watch` | off | repeat on an interval, e.g. `6h` |
| `--dry-run` | off | print the queue and exit |

Each run works on unfinished approved sites first, then captured sites waiting
for the judge, then discovered sites. Judging a site reserves three AI calls
(judge, style and tag); once `--max-judge` is used up, newly captured sites stay
`captured` for the next run. Without AI credentials the pipeline only
captures. Approved sites stay hidden (`capturing`) until their subpages and
tags are in. It stops claiming when less than 2 GB is free, and restarts the
browser every 50 sites.

Ctrl-C once stops claiming and lets in-flight sites finish; a second Ctrl-C
quits at once, and sites it held go back to the queue on any run started 30
minutes later. Every transition is printed (`[3/10] stripe.com captured 64.8s`),
appended to `data/logs/pipeline-YYYY-MM-DD.jsonl` and recorded in `events`; a
summary (counts, AI calls, estimated cost, disk added) ends each run.

### Running nightly

With cron (`crontab -e`), 3 am every night:

```
0 3 * * * cd /path/to/sqrap && npm run pipeline -- --discover --limit 100 >> data/logs/cron.log 2>&1
```

cron and launchd start with a minimal `PATH`; if `npm` is not found, use its
full path (`which npm`). On macOS, launchd also runs a missed job after the Mac
wakes. Save as `~/Library/LaunchAgents/com.sqrap.pipeline.plist`, then
`launchctl load ~/Library/LaunchAgents/com.sqrap.pipeline.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.sqrap.pipeline</string>
  <key>WorkingDirectory</key><string>/path/to/sqrap</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string><string>-lc</string>
    <string>npm run pipeline -- --discover --limit 100</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>3</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>/path/to/sqrap/data/logs/cron.log</string>
  <key>StandardErrorPath</key><string>/path/to/sqrap/data/logs/cron.log</string>
</dict>
</plist>
```

100 sites a night is a suggested starting point; pick the limit and schedule
that suit your machine and AI budget.

### On Vercel Cron

Production also runs the pipeline itself: `vercel.json` calls
`/api/cron/pipeline` every 5 minutes, and each call first counts the sites
waiting for their home capture:

- **Normal** (fewer than 100 waiting): the call returns at once, claiming
  nothing, unless the last run started at least 28 minutes ago (the
  `cron_pipeline` event), so a run still starts about every 30 minutes. A run
  styles up to 8 public sites that have no style yet (for at most a minute),
  pulls up to 15 new sites from the galleries (for at most 90 seconds), then
  takes up to 6 sites, one at a time and with at most 4 subpages each, through
  the pipeline. It stops claiming after 5 minutes.
- **Backlog** (100 or more waiting, e.g. after a big import): every call runs,
  without gallery discovery, and takes up to 16 sites, two at a time in one
  browser, with at most 48 AI calls. It keeps claiming until 450 seconds after
  the call started, and leaves re-queueing failed sites to normal runs. Runs on different instances overlap (claims are atomic); a
  call that lands on an instance whose run is still going returns at once.

Either way it uses serverless Chromium (`@sparticuz/chromium`) and the judge on
AI Gateway, and no new site is claimed later than 450 seconds into the call, so
in-flight sites have the remaining 350 seconds to finish inside the
800-second limit (one cut off anyway is reset by a later run, as a crash
attempt). The response, the
`cron_pipeline` event and the `pipeline_started` event's options carry the
`mode`. The
route answers 404 unless called with `Authorization: Bearer $CRON_SECRET`. On
Vercel the data dir is under `/tmp` (logs only); run logs are in the
function logs and `events`. A bad capture counts as a capture attempt, so a
site whose captures keep failing is retried at most 3 times.
Change the batch in `app/api/cron/pipeline/route.js` and the schedule in
`vercel.json`.

## Browse the library

`npm run dev` serves the library from Postgres (`DATABASE_URL`) and the shots
store. Before
any site is judged, `SQRAP_SHOW_UNJUDGED=1 npm run dev` also shows `captured`
sites, so a fresh capture can be browsed without an API key.

| Route | Returns |
| --- | --- |
| `GET /api/library/meta` | the taxonomy with public counts per platform, pattern, section type, industry, color, theme and style, plus the countries that have public sites (with their region) |
| `GET /api/sites?q&platform&pattern&section&industry&color&theme&style&country&cursor&limit=24` | sites with a desktop and a mobile cover screen |
| `GET /api/sites/<id>` | one site with its pages, screens and sections (404 unless public) |
| `GET /api/screens?…same filters…&cursor&limit=36` | page screenshots |
| `GET /api/sections?type&…same filters…&cursor&limit=36` | section crops |
| `GET /api/suggest?q` | up to 8 suggestions for the search box: page patterns, section types, industries, then sites |
| `GET /shots/<siteId>/<file>.webp` | a captured image of a public site, cached as immutable (any site for the admin, uncached) |

Lists answer `{ data: { items, total, next } }`; pass `next` back as `cursor`
for the following page. Unknown filter values are ignored.

`q` searches a Postgres full-text index (`search_idx`, one weighted `tsvector`
per page) with every word as a prefix, ranked by `ts_rank` with site name and
domain weighted highest.
One-character and CJK queries fall back to substring matching. The capture
engine, judge and tagger keep the index current; `npm run search:reindex`
rebuilds it, and the server rebuilds it once by itself when it holds fewer rows
than there are pages. A screen's `color` (red, orange, yellow, green, teal,
blue, purple, pink, brown, black, white or gray) and `theme` (light or dark)
come from its dominant color and palette (`lib/color.js`); capture sets them,
and `npm run color:backfill` fills screens captured before they existed.
`country` is an ISO 3166-1 alpha-2 code from the judge, and `style` one of the
site's styles (see Judge and tag).

Sites captured before agent images existed get them from their stored images
with `npm run agent:backfill` (public sites only; re-run it after approving
older captures). A screen whose full shot is too narrow is built from its `-lg`
thumbnail and marked `agent_status = 'top_only'`; a row with no usable image
is marked `'recapture'` and gets none. It only touches rows without an
`agent_status`, so it can be stopped and run again.

```sh
npm run db:migrate        # adds the search index, color columns and agent_images
npm run color:backfill    # -- --all recomputes every screen
npm run agent:backfill    # -- --batch 25 --limit 500
npm run search:reindex
```

### Accelerator badges

Sites of accelerator companies show one text badge per program after their
name, on browse cards and the site page, in `lib/taxonomy.js` `ACCELERATORS`
order. Each badge links to the company's page on that program's site. They use
Sqrap's own outlined `.badge`, never a program's logo, wordmark or color.

| Program | Source (all cohorts) | Badge |
|---|---|---|
| `yc` Y Combinator | the yc-oss mirror of YC's directory (`https://yc-oss.github.io/api/companies/all.json`) | `YC W26`: season letter and two-digit year, Winter `W`, Spring `X`, Summer `S`, Fall `F` ("Spring 2025" is `X25`); a company with an unknown batch format gets no badge |
| `techstars` Techstars | the portfolio's Typesense search | `Techstars 2025`, the cohort year (`first_session_year`): the program names ("Techstars Seattle Accelerator") are too long for a badge; `Techstars` without a year |
| `finc` Founders Inc | f.inc's `/portfolio/<slug>/` pages | `F.inc` (f.inc publishes no cohorts) |
| `speedrun` a16z speedrun | speedrun.a16z.com's `/companies?cohort=` lists and company pages | `Speedrun SR007` |

Browse filters to one program with the "+ accelerator" chip (`accel=<id>` in
the hash and in `/api/sites`, `/api/screens` and `/api/sections`; `yc=1` still
works and means `accel=yc`; an unknown id is ignored). The agent catalog adds an
`- Accelerators: YC W26 (<url>); Speedrun SR007 (<url>)` line, and agent API and
MCP site objects carry `accelerators: [{ program, name, batch, label, url }]`
(empty when none), plus the deprecated `ycBatch` and `ycUrl`.

The data is `site_accelerators` (migration 014: one row per site and program,
`batch` and `url`), filled by `pipeline/accelerators/sync.js` with each
program's fetcher in `pipeline/accelerators/<id>.js`. A site matches when its
domain equals a company website's hostname without `www.`: there is no fuzzy or
parent-domain matching, and shared hosts (facebook.com, linkedin.com,
github.com and the like) never match. When two companies share a domain the
latest cohort wins. Each program is stored in one transaction: matches are
upserted and the program's rows on sites that stopped matching are deleted. A
program whose fetch fails or lists no companies is skipped and keeps its rows.

Founders Inc and speedrun list websites only on per-company pages (one request a
second, minutes per program), so the sync caches each page's website in
`accelerator_companies` and re-reads entries after 30 days. A sync that runs
out of time stops and the next one resumes from the cache. Until every page has
been read once, a program's matches are added but none are cleared, and it
reports `pending`.

The cron syncs each program at most once a day (a complete sync records an
`accelerator_sync:<id>` event). The programs that are due go longest-waiting
first, 45 seconds each and 75 seconds per run in all, and whatever does not fit
waits for the next run (every 30 minutes). Its response has `accelerators` with
`{ fetched, matched, updated, cleared }` (and `pending`) per program.
`npm run accelerators:sync -- [--only <id>] [--minutes 10]` runs it by hand
(`npm run yc:sync` is the same command).

`sites.yc_batch` and `yc_url` (migration 013) are legacy: migration 014 copied
them into `site_accelerators` and nothing reads them now. The YC sync still
writes them so that rolling back to the code before 014 keeps fresh batches. A
later migration drops them once that rollback window is over.

## Curate (admin)

Locally: `SQRAP_ADMIN=1 npm run dev`, then open http://localhost:3000/admin. On
the live site: sign in with Google as an admin (below) and pick "Admin" in the
account menu, or open `/admin`. The admin
lists sites by status (Queue: captured, failed and in-flight; Discovered;
Approved; Rejected) with home thumbnails, score and the judge's reasons. Per
site you can approve or reject, edit name, tagline, industry and country, retag
each page's pattern and each section's type, re-capture, re-judge (needs
`ANTHROPIC_API_KEY`) or delete the site and its shots. "Add seeds"
takes URLs one per line, and "Removal requests" processes opt-outs.

Re-capture and re-judge run as background jobs inside the server process, one
at a time, and are lost on restart; the page polls `GET /api/admin/jobs`. A
re-captured site keeps its approved or rejected status (its tags fall back to
the capture engine's guesses until it is re-judged or retagged). A site a
pipeline run holds (`queued`, `capturing`, `judging`) is refused as busy.

The admin answers 404 unless **both** `SQRAP_ADMIN=1` is set and the request
comes over loopback: the socket address (stamped by `next.config.mjs`, so a
client-sent `X-Forwarded-For` cannot fake it), the `Host` header and any
`Origin` must be `localhost`, `127.0.0.1` or `::1`. Never set `SQRAP_ADMIN` on
a hosted deployment; that guard is the only protection of the local path.

On any deployment, production included, a signed-in admin account can open
`/admin` too. An account is an admin only when **all** of these hold:

- its email is allowlisted: listed in `SQRAP_ADMIN_EMAILS` (comma-separated;
  unset or empty means `jaequery@gmail.com`) or in the `admin_emails` table
  (migration `012` adds `jaequery@gmail.com`; grant more with
  `INSERT INTO admin_emails (email, created_at) VALUES ('someone@example.com', '<ISO time>')`);
- it has signed in with Google at least once, so Google vouched for the email
  (a password signup never proves it owns the address);
- it has no password. Linking Google drops a password set before, and its
  sessions, so a squatter's signup with the owner's email never becomes admin.

Everyone else, signed out or not, gets the same plain 404 from `/admin`,
`/api/admin/*` and non-public `/shots/*`. `GET /api/auth/me` reports
`user.isAdmin` for the caller's own account only, and the account menu shows
"Admin" when it is true. Admin mutations from a session must send an `Origin`
matching the host, which the admin page's own `fetch` calls do.

On Vercel, re-capture and re-judge are off: they need the in-process job queue
and a long-lived browser. Their routes answer 501 and the buttons are disabled
with that reason; the cron pipeline keeps capturing and judging new sites.
Approve, reject, edits, deletion, removals, seeds and Stats work everywhere.

| Route | Does |
| --- | --- |
| `GET /api/admin/sites?tab=queue\|discovered\|approved\|rejected&q` | sites in a tab, plus per-tab counts |
| `GET/PATCH/DELETE /api/admin/sites/<id>` | one site with pages, screens, sections and events / edit (`name`, `tagline`, `industry`, `country`, `status`, `pages: [{id, pattern}]`, `sections: [{id, type}]`, enums checked against `lib/taxonomy.js`) / delete |
| `POST /api/admin/sites/<id>/recapture`, `…/rejudge` | queue a job (409 when busy, 501 on Vercel) |
| `GET /api/admin/jobs` | recent jobs and their state; `available: false` with a `reason` on Vercel |
| `GET /api/admin/stats?range=day\|month` | sites scraped per UTC day (last 30) or month (last 12) from `events` (distinct sites with `captured`, `capture_failed`, `discovered`, `approved`), totals (all time, today, this month, sites by status) and the 50 most recently scraped sites; the admin's Stats tab (`#/stats`) |
| `POST /api/admin/seeds` | `{ urls }`, one per line, added as `discovered` |
| `GET/PATCH /api/admin/optouts` | removal requests / `{ domain, status: "approved" \| "dismissed" }` |

## Operator API (add sites remotely)

For adding sites from a machine without `DATABASE_URL` (a cloud agent, a
script), the deployment answers two routes to whoever sends
`Authorization: Bearer $SQRAP_INGEST_TOKEN`. Set the token (at least 32
random characters, e.g. `openssl rand -hex 32`) as a sensitive env var; without
it, or with a wrong token, the routes and private shots answer a plain 404.
Treat the token like a database password: it can add sites and read every
site's pipeline state, rejected ones included.

| Route | Does |
| --- | --- |
| `POST /api/operator/sites` | `{ urls: [..] }` (or one per line), at most 100, JSON only. Each is added as `discovered`, like `npm run seed`; the result per URL is `inserted`, `known` (already a site, any status) or why it was refused (opted out, not a site). Cron then captures and judges them. |
| `GET /api/operator/sites?domains=a.com,b.com` | per domain, at most 100: `site` (`status`, `quality`, judge `reasons` and `scores`, `captureProblem`, `lastError`, …) or `null`, `optout`, and `home` screens with `/shots/…` URLs, which serve private (unjudged, rejected) shots to the same token |

```sh
curl -X POST https://www.sqrap.com/api/operator/sites -H "Authorization: Bearer $SQRAP_INGEST_TOKEN" \
  -H "Content-Type: application/json" -d '{"urls":["https://example.com"]}'
curl "https://www.sqrap.com/api/operator/sites?domains=example.com" -H "Authorization: Bearer $SQRAP_INGEST_TOKEN"
```

Cron takes at most 6 sites per 30-minute run, and with 100 or more sites
waiting switches to backlog mode, a run every 5 minutes taking two sites at a
time (`MODES` in `app/api/cron/pipeline/route.js`), so a batch of 1,400 sites should drain in
about a day or two (an estimate; `pipeline_finished` events show the real rate); it does not need to be split, the queue only grows. Sites added here (and by
`npm run seed` or admin seeds, source `manual`) are captured and judged before
gallery and search finds, and the cron skips gallery discovery while 100 or
more sites wait for capture.

## Removal requests

"Request removal" in the About dialog posts `{ domain, email, reason }` to
`POST /api/removal` (5 posts per hour per IP, in memory). The domain (any URL
or host, reduced to its registrable domain) is stored in `optouts` as
`pending`: it vanishes from every public API and image at once, and discovery,
seeding and capture refuse it. The answer is the same whether or not the
domain is in the library. In the admin, **Approve removal** deletes the site's
rows and images and keeps blocking the domain; **Dismiss** lets it back into
the library and the pipeline. A new request for a dismissed domain reopens it.

### Purging cached images

Public images are served with a year-long cache, tagged `site-<siteId>`
(`Vercel-Cache-Tag`) and marked `X-Robots-Tag: noai, noimageai`. Whenever a
site leaves public view (a removal request, a judge rejection or failure of a
site that was approved before, an admin rejection, an approved removal or an
admin delete), `purgeSiteShots` in `lib/shots.js` deletes that tag from
Vercel's CDN right after the status is written and before the files go. Inside
a Vercel function it uses `@vercel/functions`; elsewhere (local admin,
`npm run judge`, a local pipeline) it calls Vercel's REST API, which needs
`VERCEL_PURGE_TOKEN` (an access token with access to the project) and
`VERCEL_PROJECT_ID` (plus `VERCEL_TEAM_ID` for a team project; both are in
`.vercel/project.json` as `projectId` and `orgId`). Without them, or when the
purge fails, it records the site in `pending_purge`, and the next cron run
purges it from inside Vercel before its batch.

## Terms for agents and API use

`/terms` (linked from the About dialog) sets the rules for scripts, the API and
AI agents: credit and link the source domain, no training on the images, keys
can be revoked, takedown through the removal flow.

## Accounts

Visitors can sign up and sign in with an email and password, or with Google;
browsing never requires an account. It is hand-rolled, with no auth library:

- Passwords are hashed with scrypt (`node:crypto`). Sessions are random 32-byte
  tokens in an httpOnly, SameSite=Lax cookie (`sqrap_session`, `Secure` over
  HTTPS and in production, 30 days); Postgres stores only the SHA-256 of the token.
- Tables `users`, `auth_identities` and `sessions` come from migration `005`.
  Run `npm run db:migrate` after pulling.
- Sign-in, sign-up and the Google start are rate-limited per client address
  (the `x-sqrap-peer` stamp, as for removal requests) and sign-in also per email.
  The limiter is in memory, so it is per server instance. Sign-in errors never say
  whether an email exists; sign-up does say "already exists".
- Google sign-in needs `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Create an
  OAuth client (type Web application) in Google Cloud Console with the authorized
  redirect URI `<your origin>/api/auth/google/callback` (add
  `http://localhost:3000/api/auth/google/callback` for local dev) and set both in
  Vercel. Without them the Google button is hidden and `/api/auth/google/start`
  answers 404. Behind a proxy that rewrites the host, set `SQRAP_PUBLIC_URL`
  (e.g. `https://sqrap.example`) so the redirect URI matches.
- A Google sign-in whose email Google reports as verified signs into the account
  with that email. If that account had a password (which was never verified by
  email), the password and its sessions are dropped, so whoever pre-registered the
  address cannot keep access; the owner signs in with Google.
- Routes: `app/api/auth/{signup,login,logout,me}` and `google/{start,callback}`;
  `lib/auth.js` holds the server logic; the dialog lives in `app/page.jsx` and
  `lib/sqrap.js` (`#/signin`, `#/signup`).

### Saved designs (Liked)

Signed in, a visitor can save ("like") a whole site or one page screenshot (a
page on one platform), Pinterest-style, and find them all at `#/liked`.

- A heart button sits on every site and page card (shown on hover, always once
  saved and on touch screens), a "Save" chip in a site's header and in the
  lightbox for pages. Pressing one signed out opens `#/signin` and the save is
  made once signed in (email/password; a Google round trip drops it).
- `#/liked` (the "Liked" top-bar link and account-menu item) lists the saved
  sites, then the saved pages, newest save first. Un-saving there keeps the card
  until the next visit, so a press can be undone.
- Table `likes` (migration `011`): one row per user and `target`, which is
  `site:<site id>` or `page:<page id>:<platform>`. A saved page points at the
  page and platform, not at a screen row, because pages keep their id across
  re-captures and screens do not. Sections are not saveable for that reason.
  Saves of sites that stop being public are hidden, not deleted.
- Routes: `GET /api/likes` (the account's targets), `POST /api/likes`
  (`{ siteId, pageId?, platform?, liked }`, JSON only) and `GET /api/likes/items`
  (the saved sites and pages for the Liked view). At most 500 saves per account.

Not built yet: email verification, password reset and named collections (boards).

## Design catalog for agents (no key)

Sqrap's claim, shown on the home page, in About, on `/agents` and in the
agent-readable files (`lib/claim.js`): it is the most AI agent friendly design
inspiration site on the internet. The home page's shell is server-rendered, so
an agent that fetches it without running JavaScript reads that line, a
JSON-LD `WebSite` description and links to the catalog.

Any agent that can fetch a URL can pick a design for a project, with no API key
(`lib/agent-catalog.js`):

- `/designs.md` (`app/designs.md/route.js`): the public sites as markdown, 24 a
  page (`?page=`), each with its tagline, industry, styles, theme, dominant
  color, palette, captured page patterns, design score, source URL, an `sm`
  thumbnail (of a page matching `theme`/`color`/`platform` when set, else the cover) and a link to its own page; filters `q`, `industry`, `style`,
  `theme`, `pattern`, `platform`, `color`, `country`; a short guide to
  matching a brief to a design; and every filter value with its count. An
  unknown value answers 400 with the valid ones.
- `/designs/<domain or id>.md` (`app/designs/[ref]/route.js`): one public site
  with the judge's home-page scores and reasons, and each captured desktop page
  (mobile when there is none) with its theme, palette, sections top to bottom
  and an `sm` thumbnail. 404 when the site is not public.

Both are the browse API's public data (only public sites, never `full`/`lg`
shots), cached on the CDN for a minute (so a removal shows within it), and
not counted against any key. The MCP server and the Agent API below give agents
more (image tiles, sections by type, similarity, briefs) with a key.

## Agent API

A read-only, keyed JSON API for scripts and AI agents under `/api/v1/`,
described by a hand-written OpenAPI 3.1 spec at `/api/v1/openapi.json` (no key
needed; `lib/openapi.js`, keep it in step with the routes). The MCP server wraps it.

| Route | Returns |
| --- | --- |
| `GET /api/v1/sites` | Sites with a screen matching every filter, each with a desktop and mobile cover screen |
| `GET /api/v1/sites/{id or domain}` | One site (`stripe.com`, a URL or an id): pages, and screens each with their sections top to bottom |
| `GET /api/v1/screens` | Page screenshots |
| `GET /api/v1/sections` | Page sections (`section` or `type` picks the type) |
| `GET /api/v1/filters` | Every filter value with its count |
| `GET /api/v1/brief` | A design brief: 5 to 8 references for a page (see Design brief) |
| `GET /api/v1/similar?id=…` | Sections or screens of other sites that look like a section or screen (see Similarity search) |
| `POST /api/v1/similar` | The same for an uploaded screenshot (body `image/*` or multipart field `image`, at most 2 MB; counts as 5 calls) |

Lists take `q`, `platform`, `pattern`, `section`, `industry`, `color`, `theme`,
`style`, `country`, `limit` (1 to 100) and `cursor` (the previous page's `next`); a filter
value outside `lib/taxonomy.js` answers 400. Only public sites (the same rule
as the browser API, so never rejected or opted-out ones) come back. Every record
carries the source `domain` and `sourceUrl`; screens add `palette`, `dominant`,
`theme` and `color`; sections add their `position` on the page; sites add
`style` and `homePageJudge`, the judge's six scores and up to three reasons, which judge only
the home page's first screens. `topOfPageOnly: true` marks images that show only
the top of the page. Images are only the agent tiles and the small `sm`
thumbnails, never the full-page or large shots. Successful reads send
`Cache-Control: s-maxage=300` with `Vary: Authorization`. Vercel's CDN never
caches a request that carries `Authorization`, so every call through it reaches
the key check and the quota; a caller's own shared proxy may still replay a
key's response for a few minutes, even after the key is revoked.
`/api/v1/sites/blog.example.com` never falls back to `example.com`.

**Keys.** A signed-in user creates up to 3 keys under the avatar menu → API keys
(`#/keys`). A key (`sqrap_…`) is shown once; Postgres keeps only its SHA-256 in
`api_keys` (migration `008`), and revoking deletes the row. Callers send it as
`Authorization: Bearer <key>`; a missing, unknown or revoked key answers 401.
Routes: `app/api/account/keys` (GET list, POST create) and
`app/api/account/keys/[id]` (DELETE revoke), JSON bodies only.

```sh
curl -H "Authorization: Bearer $SQRAP_KEY" https://sqrap.com/api/v1/sites/stripe.com
```

**Quota.** Each key may make `SQRAP_API_DAILY_QUOTA` calls (default 1000) per
UTC day; past that, calls answer 429 with `Retry-After` (seconds to midnight
UTC). Every answer carries `X-RateLimit-Limit` and `X-RateLimit-Remaining`. The
counters live in Upstash Redis: add it from the Vercel Marketplace, which sets
`KV_REST_API_URL`/`KV_REST_API_TOKEN` (or set `UPSTASH_REDIS_REST_URL`/
`UPSTASH_REDIS_REST_TOKEN`). Without them (local dev) the counters are in memory,
per server instance, with a warning logged once, and on Vercel the cron
snapshot is skipped rather than overwrite the table with zeros. No call writes to Postgres. If
Redis cannot be reached, calls are let through and the error is logged.

**Usage.** Each ISO week Redis keeps the set of keys that made a successful (200) call
(counted exactly with `SCARD`) and a counter per endpoint or MCP tool
(`v1/screens`, `v1/site`, …); an MCP tool calls `chargeCall` before and
`recordUsage` after, like `agentResponse`. Every cron run copies the running and the previous
week into `agent_usage_weekly` (`metric` `active_keys` or `calls`):

```sql
SELECT week, metric, name, value FROM agent_usage_weekly ORDER BY week DESC, metric, name;
```

**Per-IP backstop.** Keys bound each account, not each caller, so turn on a
Vercel WAF rate-limit rule as well (Project → Firewall → Configure → New rule):
If *Request Path* starts with `/api/v1/` or equals `/mcp`, then *Rate Limit*, fixed window,
60 seconds, 120 requests, keyed on *IP*, action *Too Many Requests (429)*. The
owner turns it on in the dashboard; nothing in the code depends on it.

## Similarity search

`find_similar` (REST `/api/v1/similar`, MCP tool `find_similar`) searches image
embeddings: one 512-dim vector per section and per home-page screen of a public
site, from its top agent tile, made by `cohere/embed-v4.0` through Vercel AI
Gateway (`lib/embeddings.js`; `AI_GATEWAY_API_KEY` or the Vercel OIDC token,
like the judge). They live in `embeddings` (migration `009`, pgvector with an
HNSW cosine index; Neon has the extension). Results are public sections or
screens, most similar first, with `similarity` (cosine); a query by `id` leaves
out that item's own site, and `kind`, `type`, `platform` and `limit` (at most
48) narrow it. An uploaded screenshot is scaled like an agent tile, embedded in
memory and never stored, and counts as 5 calls against the key's quota.

Every cron run embeds up to 64 new items (sections first, newest approvals
first, time-boxed to a minute) before the pipeline (`pipeline/embed.js`). A
failed image keeps a row with its error and is retried up to 3 times. Sites
already in the library are backfilled with `npm run embed:backfill`: without
`--yes` it embeds 50 pending sections without storing them and prints the
estimated cost of everything pending; with `--yes` it embeds it all, and can be
stopped and run again. When a site leaves public view, `purgeSiteShots` deletes
its embeddings. `AI_GATEWAY_BASE_URL` points the client at another
OpenAI-compatible `/embeddings` endpoint, such as a local stub.

```sh
npm run db:migrate                    # 009: pgvector and the embeddings table
npm run embed:backfill                # dry run: 50 sections, estimated total cost
npm run embed:backfill -- --yes       # everything pending (--batch 32 --limit N)
curl -H "Authorization: Bearer $SQRAP_KEY" "https://sqrap.com/api/v1/similar?id=<section id>&limit=5"
curl -H "Authorization: Bearer $SQRAP_KEY" -H "Content-Type: image/png" --data-binary @shot.png \
  "https://sqrap.com/api/v1/similar?kind=sections"
```

## Design brief

`design_brief` (MCP tool, REST `GET /api/v1/brief`, `agentBrief` in
`lib/agent-api.js`) gathers references for a page an agent is about to build.
The goal is any of `pattern`, `industry`, `theme`, `style` and `platform`, plus
an optional `reference` (a site domain, or a site, section or screen id) and
`limit` (5 to 8, default 6). It returns public sites with a screen matching the
filters, most similar to the reference's home page first (image embeddings, see
Similarity search) or else the judge's best first. When fewer than 5 match,
filters are dropped (style, then theme, industry, pattern) and the list is
topped up; `relaxed` says which, on the brief and on each added reference.
Each reference has its source `domain` and `sourceUrl`, the page that stands
for it (a screen matching the filters, desktop and the home page first) with that page's
palette, theme, color, section order and agent image, the site's styles and the
judge's home-page scores; `summary` counts themes and styles and lists the
section types at least half the pages share, in their usual order. The brief
says it is aggregated facts, not a critique. It costs one call.

```sh
curl -H "Authorization: Bearer $SQRAP_KEY" "https://sqrap.com/api/v1/brief?pattern=Pricing&theme=dark&style=minimal&reference=linear.app"
```

## MCP server

`/mcp` (`app/mcp/route.js`, tools in `lib/agent-mcp.js`) is a remote MCP server
for coding agents: Streamable HTTP, stateless, built on `mcp-handler` 2.x and
`@modelcontextprotocol/server` 2.x (zod 4). It takes the same API key as the
Agent API (`Authorization: Bearer <key>`; none or an unknown one answers 401
before any MCP handling) and calls the same reads directly, not over HTTP.

| Tool | Does |
| --- | --- |
| `search_screens` | Whole pages by `q` and the taxonomy filters (`platform`, `pattern`, `section`, `industry`, `color`, `theme`, `style`, `country`) |
| `search_sections` | Single sections by `type`, `q` and the same filters |
| `get_site` | One site by id or domain: its pages with theme, palette and image URLs, and each page's sections in order |
| `find_similar` | Sections or screens that look like a result (`id`) or a base64 screenshot (`image`, at most 2 MB, counts as 5 calls) |
| `design_brief` | 5 to 8 references for a page: the goal's filters, ranked by similarity to a `reference` or by the judge (see Design brief) |
| `list_filters` | Every filter value with its count |

Each tool call is charged to the key's daily quota and, when it succeeds,
counted as `mcp/<tool>` in the weekly usage; `initialize` and `tools/list`
cost nothing. Results are compact JSON (source `domain` and `sourceUrl`, site
name, pattern or section type, palette, theme, image URLs; never `full`/`lg`
shots), 12 per page by default and at most 24. With `include_images: true`
up to four of the images are also inlined as WebP, 512px wide and at most
1024px tall. Tool descriptions and the server instructions ask the agent to
credit the source site and point at `/terms`.

```sh
claude mcp add --transport http sqrap https://sqrap.com/mcp --header "Authorization: Bearer $SQRAP_KEY"
npx @modelcontextprotocol/inspector --cli https://sqrap.com/mcp --transport http \
  --header "Authorization: Bearer $SQRAP_KEY" --method tools/list
```

Around it: `/agents` (`app/agents/`) is the setup page for Claude Code, Cursor
and VS Code, linked from About and the API keys dialog; `skills/sqrap/SKILL.md`
is a Claude Code skill saying when and how to use Sqrap; `/llms.txt`
(`app/llms.txt/route.js`) describes Sqrap for LLMs and points to the keyless
design catalog; `server.json` is the MCP
Registry entry (`com.sqrap/mcp`), published by the owner with `mcp-publisher`
after verifying the sqrap.com domain.

## Files

- `app/layout.jsx`: the document, metadata and font
- `app/page.jsx`: the page shell
- `app/Sqrap.jsx`: client component that mounts the renderer
- `app/styles.css`: design tokens and components
- `styles.md`: the style guide those tokens come from
- `lib/db.js`: the Postgres pool and query helpers (server only)
- `lib/shots.js`: reading, writing and deleting captured images (Vercel Blob, or local disk without a token), and purging them from the CDN cache
- `lib/queries.js`: the public browse queries (filters, keyset pagination, public-site rule) behind the API (server only)
- `lib/api.js`: request parsing and JSON responses shared by the route handlers
- `app/api/**/route.js`, `app/shots/[...path]/route.js`: the browse API and the image server
- `lib/taxonomy.js`: platforms, page patterns, section types, industries, color buckets, themes, styles and site statuses
- `lib/search.js`: the full-text index (reindexing and safe tsquery building); `scripts/search-reindex.js` is its CLI
- `lib/color.js`: color bucket and theme rules; `scripts/color-backfill.js` applies them to stored screens
- `lib/regions.js`: country codes grouped by region for the Country filter
- `db/migrations/*.sql`: the schema, applied in order by `scripts/db-migrate.js`
- `pipeline/discover/`: discovery adapters (`galleries/`, `search.js`, `seeds.js`), URL normalization and polite fetching
- `scripts/discover.js`, `scripts/seed.js`: the discovery CLIs
- `seeds.example.txt`: a starter list of well-designed sites
- `data/`: local pipeline logs, and captures when there is no Blob token (git-ignored; `SQRAP_DATA_DIR` moves it)
- `pipeline/dedupe.js`, `scripts/dedupe-sections.js`: the wrap and duplicate-section guards, and the backfill that fixes older captures (see Clean up wrapped captures)
- `pipeline/agent-images.js`, `scripts/backfill-agent.js`: agent-sized image tiles, written by capture and backfilled for older captures
- `scripts/import-sqlite.js`: one-off copy of an old SQLite library and its `data/shots` into Postgres and Blob
- `pipeline/*.js`: the capture engine (browser, page prep, robots/opt-out checks, sections, subpage links); `scripts/capture.js` is its CLI
- `pipeline/judge/`: the Claude vision judge, tagger and styler (rubric, image prep, output schema, style calibration set); `scripts/judge.js` and `scripts/style-calibration.js` are its CLIs
- `pipeline/run.js`: the orchestrator (claims, resume, AI budget, logging); `scripts/pipeline.js` and `scripts/pipeline-status.js` are its CLIs
- `app/admin/`, `app/api/admin/**`: the local admin; `lib/admin.js` (loopback + env guard), `lib/admin-data.js` (its queries and actions), `lib/jobs.js` (in-process job queue)
- `app/api/operator/**`, `lib/operator.js`: the operator API (Bearer `SQRAP_INGEST_TOKEN`, else 404) for adding sites and reading their pipeline state remotely; it reuses `lib/admin-data.js`
- `app/api/removal/route.js`: public removal requests
- `app/terms/page.jsx`: the terms for agents and API use
- `app/mcp/route.js`, `lib/agent-mcp.js`, `app/agents/`, `skills/sqrap/`, `app/llms.txt/route.js`, `server.json`: the MCP server, its setup page, the Claude Code skill, llms.txt and the MCP Registry entry (see MCP server)
- `app/designs.md/route.js`, `app/designs/[ref]/route.js`, `lib/agent-catalog.js`, `lib/claim.js`: the keyless markdown design catalog for agents and Sqrap's claim (see Design catalog for agents)
- `app/api/auth/**`, `lib/auth.js`: accounts (see Accounts) and API keys
- `app/api/likes/**`: saved designs and the Liked view's data (see Saved designs)
- `lib/embeddings.js`, `pipeline/embed.js`, `scripts/backfill-embeddings.js`: image embeddings and find_similar (see Similarity search)
- `app/api/v1/**`, `lib/agent-api.js`, `lib/agent-quota.js`, `lib/openapi.js`, `app/api/account/keys/**`: the agent API, its quota and usage counters, its OpenAPI spec and key management (see Agent API)
- `next.config.mjs`: stamps each request with its real socket address for the admin guard and the rate limit
- `lib/sqrap.js`: hash routing, search and filters, fetching from the API, infinite scroll, rendering and the lightbox

## URLs

State lives in the hash, so every view can be shared:
`#/apps` (sites), `#/screens`, `#/sections`, `#/app/<id>` (one site), `#/liked`
(the signed-in account's saved sites and pages), `#/keys` (the API keys dialog,
after signing in), plus
`?q=&platform=&pattern=&section=&industry=&color=&theme=&style=&country=`. `platform`
is `desktop` or `mobile`, `color` a color bucket, `theme` `light` or `dark`,
`style` a style id such as `minimal` and `country` a two-letter code such as `JP`.
