// Cofolios (cofolios.com), a hand-picked gallery of about 190 portfolios of
// product designers who worked or interned at Airbnb, Apple, Google, Meta,
// Microsoft, Amazon, Intuit, LinkedIn, Instagram and Figma, plus a "Curated"
// group (added 2020 to 2024). It was noted as not adaptable because its
// Next.js pages render client-side, but the app reads its list straight from
// its public Firestore database: portfolios/<company>/people, one document
// per designer with fullName, portfolioUrl, company and datePosted or addedOn.
// The listing reads the same collections through Firestore's REST API with
// the web key the site ships (a collection-group query is refused, so each
// company is read on its own, as the app does). Each address is yielded once,
// newest first; each designer's /portfolio/<Full-Name> page is its sourceRef,
// and every site is tagged Agency & Portfolio. LinkedIn and other social
// profiles are refused later by the blocklist. The site serves no robots.txt
// (its static export answers every path with the app shell).
import { fetchJson } from "../http.js";

const BASE = "https://www.cofolios.com";
// The public web API key and project from the site's own bundle.
const KEY = "AIzaSyAxo-VMReU06TnaXLcf7ndCcUNij4qnaEM";
const DOCS = "https://firestore.googleapis.com/v1/projects/cofolios-app/databases/(default)/documents";
// The groups the home page reads, in its order.
const COMPANIES = ["Airbnb", "Instagram", "Figma", "Intuit", "Meta", "Google", "Microsoft", "Amazon", "Linkedin", "Curated", "Apple"];

export const name = "cofolios";

const str = (f) => (typeof f?.stringValue === "string" ? f.stringValue.trim() : "");

// When a record was added, as an ISO string ("" when unknown).
function added(fields) {
  if (fields?.addedOn?.timestampValue) return fields.addedOn.timestampValue;
  const secs = Number(fields?.datePosted?.mapValue?.fields?.seconds?.integerValue);
  return Number.isFinite(secs) && secs > 0 ? new Date(secs * 1000).toISOString() : "";
}

// Firestore documents to { url, name, company, added }, newest first, one per address.
export function portfolios(docs) {
  if (!Array.isArray(docs)) return [];
  const records = docs
    .map((d) => ({ url: str(d?.fields?.portfolioUrl), name: str(d?.fields?.fullName), company: str(d?.fields?.company), added: added(d?.fields) }))
    .filter((r) => r.name && /^https?:\/\//i.test(r.url) && !/^https?:\/\/([^/]+\.)?cofolios\.com\b/i.test(r.url));
  records.sort((a, b) => b.added.localeCompare(a.added));
  const seen = new Set();
  return records.filter((r) => {
    const key = r.url.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function people(company) {
  const docs = [];
  let token = "";
  do {
    const url = `${DOCS}/portfolios/${encodeURIComponent(company)}/people?key=${KEY}&pageSize=300${token ? `&pageToken=${encodeURIComponent(token)}` : ""}`;
    const page = await fetchJson(url);
    docs.push(...(page.documents ?? []));
    token = page.nextPageToken ?? "";
  } while (token);
  return docs;
}

export async function* listing({ limit }) {
  const docs = [];
  for (const company of COMPANIES) {
    try {
      docs.push(...(await people(company)));
    } catch (err) {
      console.warn(`[${name}] ${company}: ${err.message}`);
    }
  }
  const list = portfolios(docs);
  if (!list.length) console.warn(`[${name}] no portfolios from Firestore; its database may have changed`);
  for (const r of list.slice(0, limit)) {
    yield {
      url: r.url,
      name: r.name,
      industryHint: "Agency & Portfolio",
      sourceRef: `${BASE}/portfolio/${encodeURIComponent(r.name.replace(/ /g, "-"))}`,
    };
  }
}
