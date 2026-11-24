// The Australian Good Design Awards (good-design.org), Good Design Australia's
// annual international awards, judged by an expert jury since 1958. Its Web
// Design and Development discipline (under Digital Design) names a few dozen
// winners a year: government and council sites, museums, libraries, charities,
// banks, universities and brands (Lifeline, Bankwest, Q2032, the Ngarrngga
// Project, Spylt). Projects are read newest first from the WordPress REST API
// (the discipline's archive pages show only a few cards each); entries that
// did not win (Entries, Finalist) are skipped. The API carries no links, so
// one project page is fetched per new site (known source refs are skipped).
// Its "view website" link is often the designing agency's site rather than the
// winner's, so a link whose host names one of the credited designers is passed
// over for the next one ("Buy online" often holds the client's site), unless it
// also names the commissioner (an in-house entry); an entry that links only its
// agency is skipped. robots.txt allows everything.
import * as cheerio from "cheerio";
import { knownSourceRefs } from "../../../lib/db.js";
import { fetchHtml, fetchJson } from "../http.js";

const BASE = "https://good-design.org";
const API = `${BASE}/wp-json/wp/v2`;
const DISCIPLINE = "web-design-development";
const PER_PAGE = 100;
const MAX_PAGES = 10;
const NOT_WINNERS = new Set(["entries", "finalist"]);

export const name = "gooddesignaustralia";

const NOT_A_SITE = /^https?:\/\/([^/]+\.)?(good-design\.org|instagram\.com|linkedin\.com|facebook\.com|twitter\.com|x\.com|behance\.net|vimeo\.com|youtube\.com|apps\.apple\.com|play\.google\.com|issuu\.com)\b/i;
// Words too common in studio names to tie a host to one.
const GENERIC = new Set(["the", "and", "digital", "studio", "studios", "design", "designs", "agency", "creative", "group", "australia", "team", "web", "interactive", "media", "development", "pty", "ltd", "limited", "australian", "government", "council", "department", "city", "national"]);

const text = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const letters = (s) => String(s ?? "").toLowerCase().normalize("NFKD").replace(/&/g, "and").replace(/[^a-z0-9]/g, "");

function asSite(href) {
  let url = text(href);
  if (/^www\./i.test(url)) url = `https://${url}`;
  if (!/^https?:\/\/[^/]+\.[^/]+/i.test(url) || NOT_A_SITE.test(url)) return null;
  try {
    return new URL(url).href;
  } catch {
    return null;
  }
}

// The host's name without "www." and its public suffix ("spicyweb" for
// spicyweb.com.au), with and without "and" (soulandwolf.com.au is Soul+Wolf).
function hostLabels(url) {
  const parts = new URL(url).hostname.toLowerCase().replace(/^www\./, "").split(".");
  const keep = parts.filter((p, i) => i === 0 || !/^(com|net|org|gov|edu|co|au|nz|io|uk|us|agency|design|digital|studio|tech|im|app|site)$/.test(p));
  const label = letters(keep.join(""));
  return [label, label.replace(/and/g, "")].filter((l) => l.length >= 3);
}

// Whether a credited name ("Spicy Web", "MASS (Design)", "Kirra Services & Jude
// Digital") is the one the host stands for.
function names(url, credit) {
  const whole = letters(credit);
  const words = String(credit).toLowerCase().normalize("NFKD").split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !GENERIC.has(w));
  return hostLabels(url).some((label) =>
    (whole.length >= 3 && (label.includes(whole) || whole.includes(label))) || words.some((w) => label.includes(w)));
}

// The winner's own site on a project page, or null when it links only its agency.
async function siteOf(page) {
  const $ = cheerio.load(await fetchHtml(page));
  const credits = (key) => $(`a[href*='design-and-commission-detail/?${key}=']`).get().map((a) => text($(a).text())).filter(Boolean);
  const designers = credits("design");
  const commissioners = credits("commision");
  const links = $(".project-description a[href]").get().map((a) => asSite($(a).attr("href"))).filter(Boolean);
  return links.find((url) => commissioners.some((c) => names(url, c)) || !designers.some((d) => names(url, d))) ?? null;
}

export async function* listing({ limit }) {
  let discipline, awardTypes;
  try {
    [discipline] = await fetchJson(`${API}/project-discipline?slug=${DISCIPLINE}&_fields=id`);
    awardTypes = await fetchJson(`${API}/project-award-type?per_page=100&_fields=id,slug`);
  } catch (err) {
    console.warn(`[${name}] skipping: ${err.message}`);
    return;
  }
  if (!discipline?.id) {
    console.warn(`[${name}] no ${DISCIPLINE} discipline in ${API}/project-discipline; the site may have changed`);
    return;
  }
  const notWinners = new Set(awardTypes.filter((t) => NOT_WINNERS.has(t.slug)).map((t) => t.id));
  let yielded = 0;
  for (let page = 1; page <= MAX_PAGES; page++) {
    let projects;
    try {
      projects = await fetchJson(`${API}/project?project-discipline=${discipline.id}&per_page=${PER_PAGE}&page=${page}&_fields=link,title,project-award-type`);
    } catch (err) {
      // Past the last page WordPress answers 400.
      if (page === 1) console.warn(`[${name}] skipping: ${err.message}`);
      return;
    }
    if (!Array.isArray(projects) || !projects.length) {
      if (page === 1) console.warn(`[${name}] no projects from ${API}/project; its API may have changed`);
      return;
    }
    const winners = projects.filter((p) => p?.link?.startsWith(`${BASE}/projects/`) && !(p["project-award-type"] ?? []).some((id) => notWinners.has(id)));
    const known = await knownSourceRefs(winners.map((p) => p.link));
    for (const p of winners) {
      if (yielded >= limit) return;
      if (known.has(p.link)) continue;
      let url;
      try {
        url = await siteOf(p.link);
      } catch (err) {
        console.warn(`[${name}] skipping ${p.link}: ${err.message}`);
        continue;
      }
      if (!url) continue;
      yielded++;
      yield { url, name: null, sourceRef: p.link };
    }
    if (projects.length < PER_PAGE) return;
  }
}
