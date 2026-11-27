// Best of Swiss Web (bestofswissweb.swiss), Switzerland's national award for digital
// work, judged by an expert jury in categories such as Creativity, User
// Experience, Brand Experience, Digital Commerce and Public Value. Its Hall of Fame
// page is a client-rendered shell; the cards come from one JSON file a year,
// /integration/bosw/hall-of-fame-<year>.json (2012 onwards, about 160 entries
// each), whose entries carry the project, client, contractor (the agency), category,
// award and the project's link. Only the medal winners of the design and product
// categories are read (Master, Gold, Silber, Bronze: about 40 sites a year, such as
// Chopard, Ricola, Transa, Zentrum Paul Klee, Schule für Gestaltung Basel,
// Kanton Basel-Stadt); the shortlist and the campaign categories (Marketing,
// Performance and Digital Campaigns, Crossmedia, Video) are skipped, and so is
// Productivity, mostly internal tools and configurators. The latest eight years are
// read newest first, Master and Gold before Silber and Bronze. An entry that links
// to a video, a presentation or a case study on the contractor's own site (its
// host names the agency but not the client) is skipped, since the link is not the
// site, and so are demo builds and sign-in apps (app., my., portal. hosts). The
// Hall of Fame page with the year and project as its fragment is the sourceRef.
// robots.txt is absent (404), so everything is allowed.
import { allowedByRobots, fetchJson } from "../http.js";

const BASE = "https://www.bestofswissweb.swiss";
const HALL_OF_FAME = `${BASE}/bosw/hall-of-fame`;
const FIRST_YEAR = 2012;
const MAX_YEARS = 8;

export const name = "bestofswissweb";

// Award labels (German, lowercased) in reading order; Shortlist is not read.
const AWARD_RANK = { master: 0, gold: 1, silber: 2, silver: 2, bronze: 3 };

// Categories, lowercased, whose winners are sites; older years used Creation and
// Usability for what are now Creativity and User Experience.
const CATEGORIES = new Set([
  "creativity", "creation", "user experience", "usability", "brand experience",
  "digital commerce", "technology", "public value", "public affairs", "business",
  "innovation", ".swiss",
]);

const INDUSTRY = { "digital commerce": "E-commerce" };

// Videos, presentations, short links and the case-study hosts agencies enter
// (Jung von Matt's awardhub.ch, thjnk's campaignhub.ch, Freundliche Grüsse's
// weworkhardforthemoney.ch, go2case.link), not the site itself.
const NOT_A_SITE = /^https?:\/\/([^/]+\.)?(bestofswissweb\.(swiss|ch)|awardhub\.ch|campaignhub\.ch|weworkhardforthemoney\.ch|go2case\.link|bit\.ly|frame\.io|youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|squarespace\.com|wetransfer\.com|dropbox\.com|google\.com|apple\.com|issuu\.com|instagram\.com|linkedin\.com|facebook\.com|behance\.net)\b/i;
// Demo and staging builds, and sign-in apps whose capture would be a login screen.
const NOT_PUBLIC = /^(staging|stage|dev|demo|preview|bosw|app|my|portal|login|onboarding)\./i;

const text = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const letters = (s) => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");

// The host's registrable label ("eyekon" for bosw.eyekon.ch), good enough for the
// Swiss and .com domains the award links to.
function labelOf(host) {
  const parts = host.replace(/^www\./, "").split(".");
  return parts.length > 1 ? parts[parts.length - 2] : parts[0];
}

export function siteOf(entry) {
  const url = text(entry.link);
  if (!/^https?:\/\//i.test(url) || NOT_A_SITE.test(url)) return null;
  let host;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (NOT_PUBLIC.test(host)) return null;
  const label = letters(labelOf(host));
  // A case study on the agency's own site: its host names one of the contractors
  // ("cando-image.com" for Cando) and not the client. An entrant's own product
  // (client and contractor alike) is kept.
  const agencies = text(entry.contractor).split("|").map((a) => letters(a).replace(/(ag|gmbh|sa)$/, "")).filter((a) => a.length >= 4);
  const agencyHost = agencies.some((a) => a.includes(label) || label.includes(a));
  const ownWork = letters(entry.client) === letters(entry.contractor);
  if (label.length >= 3 && agencyHost && !ownWork && !letters(entry.client).includes(label)) return null;
  return url;
}

// One year's entries as candidates, best award first, one per link.
export function parse(entries, year) {
  const picked = (Array.isArray(entries) ? entries : [])
    .filter((e) => text(e.award).toLowerCase() in AWARD_RANK && CATEGORIES.has(text(e.category).toLowerCase()))
    .sort((a, b) => AWARD_RANK[text(a.award).toLowerCase()] - AWARD_RANK[text(b.award).toLowerCase()]);
  const seen = new Set();
  const out = [];
  for (const e of picked) {
    const url = siteOf(e);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      url,
      name: text(e.client) || text(e.project) || null,
      industryHint: INDUSTRY[text(e.category).toLowerCase()] ?? null,
      sourceRef: `${HALL_OF_FAME}#${year}-${encodeURIComponent(text(e.project))}`,
    });
  }
  return out;
}

export async function* listing({ limit }) {
  let yielded = 0;
  let years = 0;
  for (let year = new Date().getFullYear(); year >= FIRST_YEAR && years < MAX_YEARS; year--) {
    if (yielded >= limit) return;
    const file = `${BASE}/integration/bosw/hall-of-fame-${year}.json`;
    if (!(await allowedByRobots(file))) {
      console.warn(`[${name}] robots.txt disallows ${file}`);
      return;
    }
    let entries;
    try {
      entries = await fetchJson(file);
    } catch (err) {
      console.warn(`[${name}] skipping ${year}: ${err.message}`);
      continue;
    }
    years++;
    const candidates = parse(entries, year);
    if (!candidates.length) console.warn(`[${name}] no medal winners in ${file}; its format may have changed`);
    for (const c of candidates) {
      if (yielded >= limit) return;
      yielded++;
      yield c;
    }
  }
}
