// Helpers shared by the accelerator fetchers.

// "zeet.co" or "https://zeet.co/" -> "https://zeet.co/"; null for anything
// that is not an http(s) URL.
export function siteUrl(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  try {
    const u = new URL(/^[a-z][\w+.-]*:\/\//i.test(text) ? text : `https://${text}`);
    if ((u.protocol !== "https:" && u.protocol !== "http:") || !u.hostname.includes(".")) return null;
    return u.href;
  } catch {
    return null;
  }
}

// Runs details() over the rows one at a time (the fetchers' own pages are
// throttled to 1 request a second per host anyway).
export async function withDetails(program, rows, log = () => {}) {
  const out = [];
  for (const row of rows) {
    try {
      out.push(await program.details(row));
    } catch (err) {
      log(`[${program.name}] ${row.companyUrl}: ${err.message}`);
      out.push(row);
    }
  }
  return out;
}
