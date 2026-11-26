// Polite HTTP for discovery: identifies as SqrapBot, waits 1s between requests
// to the same host, times out after 15s, retries twice with backoff, and checks
// the host's robots.txt before every crawl request.
import https from "node:https";

export const USER_AGENT = "SqrapBot/1.0 (+https://github.com/jaequery/sqrap)";
// Our own robots.txt group first, then the legacy one from before the rename.
const BOTS = ["sqrapbot", "jethrobot"];
const SPACING_MS = 1000;
const TIMEOUT_MS = 15000;
const RETRIES = 2;

// fetch refuses responses whose headers pass Node's 16 KB default, and some hosts
// send more (webflow.com: two 8 KB Content-Security-Policy headers).
const HEADERS_OVERFLOW = "UND_ERR_HEADERS_OVERFLOW";
const MAX_HEADER_BYTES = 64 * 1024;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One promise chain per host, so requests to a host run 1s apart.
const hostQueues = new Map();
function throttle(host) {
  const prev = hostQueues.get(host) ?? Promise.resolve();
  const turn = prev.then(() => sleep(SPACING_MS));
  hostQueues.set(host, turn);
  return prev;
}

async function rawFetch(url, init = {}) {
  const host = new URL(url).host;
  let lastErr;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt) await sleep(1000 * 2 ** attempt);
    await throttle(host);
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "user-agent": USER_AGENT, ...init.headers },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status} for ${url}`);
        continue;
      }
      return res;
    } catch (err) {
      if (err.cause?.code === HEADERS_OVERFLOW) throw err; // fails the same way every time
      lastErr = err;
    }
  }
  throw lastErr;
}

// A GET through node:https, which takes a larger header limit than fetch, for a
// robots.txt whose headers overflow fetch's. Follows up to `hops` redirects like
// fetch does. Resolves { status, type, text }.
async function getWithLargeHeaders(url, hops = 3) {
  await throttle(new URL(url).host);
  const res = await new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "user-agent": USER_AGENT }, maxHeaderSize: MAX_HEADER_BYTES, timeout: TIMEOUT_MS }, (res) => {
      res.setEncoding("utf8");
      let text = "";
      res.on("data", (chunk) => (text += chunk));
      res.on("end", () => resolve({ status: res.statusCode, type: res.headers["content-type"] || "", location: res.headers.location, text }));
      res.on("error", reject);
    });
    req.on("timeout", () => req.destroy(new Error(`timeout for ${url}`)));
    req.on("error", reject);
  });
  if (res.status >= 300 && res.status < 400 && res.location && hops > 0) {
    const next = new URL(res.location, url);
    if (next.protocol === "https:") return getWithLargeHeaders(next.href, hops - 1);
  }
  return res;
}

/* ---------- robots.txt ---------- */

// Returns the Allow/Disallow rules that apply to SqrapBot (its own group, else a
// legacy JethroBot group, else *).
export function parseRobots(text) {
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "user-agent") {
      if (!lastWasAgent) groups.push((current = { agents: [], rules: [] }));
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (current && (key === "allow" || key === "disallow") && value) {
      current.rules.push({ allow: key === "allow", path: value });
    }
  }
  const own = BOTS.map((bot) => groups.filter((g) => g.agents.some((a) => a !== "*" && bot.includes(a)))).find((g) => g.length);
  const pick = own ?? groups.filter((g) => g.agents.includes("*"));
  return pick.flatMap((g) => g.rules);
}

function ruleRegex(rulePath) {
  const anchored = rulePath.endsWith("$");
  const body = (anchored ? rulePath.slice(0, -1) : rulePath)
    .replace(/[.+?^{}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp("^" + body + (anchored ? "$" : ""));
}

// Longest matching rule wins; Allow wins a tie.
export function robotsAllows(rules, pathAndQuery) {
  let best = null;
  for (const rule of rules) {
    if (!ruleRegex(rule.path).test(pathAndQuery)) continue;
    if (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.allow)) best = rule;
  }
  return !best || best.allow;
}

const robotsCache = new Map();
async function robotsFor(origin) {
  if (!robotsCache.has(origin)) {
    robotsCache.set(origin, (async () => {
      const url = origin + "/robots.txt";
      try {
        let status, type, text;
        try {
          const res = await rawFetch(url);
          status = res.status;
          type = res.headers.get("content-type") || "";
          text = res.ok ? await res.text() : "";
        } catch (err) {
          if (err.cause?.code !== HEADERS_OVERFLOW || !url.startsWith("https:")) throw err;
          ({ status, type, text } = await getWithLargeHeaders(url));
          if (status === 429 || status >= 500) throw new Error(`HTTP ${status} for ${url}`);
        }
        if (status < 200 || status >= 300) return []; // no robots.txt: everything allowed
        if (type.includes("text/html")) return []; // an HTML 404 page served as 200
        return parseRobots(text);
      } catch {
        return null; // unreachable: treat as disallow-all
      }
    })());
  }
  return robotsCache.get(origin);
}

export async function allowedByRobots(url) {
  const u = new URL(url);
  const rules = await robotsFor(u.origin);
  return rules !== null && robotsAllows(rules, u.pathname + u.search);
}

/* ---------- Public helpers ---------- */

// Fetches a crawl page's HTML. Throws when robots.txt forbids it or it fails.
export async function fetchHtml(url) {
  if (!(await allowedByRobots(url))) throw new Error(`robots.txt disallows ${url}`);
  const res = await rawFetch(url, { headers: { accept: "text/html" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// Like fetchHtml, but also returns the cookies the page sets as one Cookie
// header value, for a search whose POST needs the page's session (Laravel's
// CSRF check).
export async function fetchHtmlSession(url) {
  if (!(await allowedByRobots(url))) throw new Error(`robots.txt disallows ${url}`);
  const res = await rawFetch(url, { headers: { accept: "text/html" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  return { html: await res.text(), cookie };
}

// Like fetchHtml, but POSTs a form (a search that only answers POST).
// `cookie` sends a session from fetchHtmlSession.
export async function postHtml(url, form, { cookie } = {}) {
  if (!(await allowedByRobots(url))) throw new Error(`robots.txt disallows ${url}`);
  const res = await rawFetch(url, {
    method: "POST",
    headers: { accept: "text/html", "content-type": "application/x-www-form-urlencoded", ...(cookie ? { cookie } : {}) },
    body: new URLSearchParams(form).toString(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  // Decoded in the charset the response or its <meta> declares (old ASP
  // pages send iso-8859-1 without saying so in the header).
  const bytes = new Uint8Array(await res.arrayBuffer());
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 2048));
  const charset = (res.headers.get("content-type") ?? "").match(/charset=([\w-]+)/i)?.[1] ?? head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ?? "utf-8";
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder().decode(bytes);
  }
}

// For APIs (no robots check): returns parsed JSON or throws.
export async function fetchJson(url, init = {}) {
  const res = await rawFetch(url, { ...init, headers: { accept: "application/json", ...init.headers } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// Follows up to `hops` redirects with HEAD and returns the final URL.
export async function resolveRedirects(url, hops = 3) {
  let current = url;
  for (let i = 0; i < hops; i++) {
    const res = await rawFetch(current, { method: "HEAD", redirect: "manual" });
    const next = res.status >= 300 && res.status < 400 && res.headers.get("location");
    if (!next) break;
    current = new URL(next, current).href;
  }
  return current;
}
