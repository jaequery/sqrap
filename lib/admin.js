// The admin's guard. Server only (it reaches lib/db.js through lib/auth.js).
// A request may use the admin in either of two ways; anything else gets a plain
// 404, so the admin stays invisible:
//
// - Local: SQRAP_ADMIN=1 AND the request arrived over loopback. The socket
//   address (stamped by next.config.mjs), the Host header and, when sent, the
//   Origin all have to be local.
// - Signed in, on any deployment: the session's account is an admin
//   (isAdminAccount below: an allowlisted email, a linked Google identity and
//   no password). Mutations must also carry an Origin matching the Host; with
//   the SameSite=Lax session cookie that keeps other sites out.
import { isAdminUser } from "./db.js";
import { normalizeEmail, sessionUser } from "./auth.js";

export const DEFAULT_ADMIN_EMAILS = ["jaequery@gmail.com"];

// The allowlist: SQRAP_ADMIN_EMAILS (comma-separated), or DEFAULT_ADMIN_EMAILS
// when it is unset or lists nothing. Rows in admin_emails (migration 012) are
// allowlisted as well; see isAdminUser in lib/db.js.
export function adminEmails() {
  const listed = (process.env.SQRAP_ADMIN_EMAILS || "").split(",").map(normalizeEmail).filter(Boolean);
  return listed.length ? listed : DEFAULT_ADMIN_EMAILS;
}

// Whether a signed-in account ({ id }) is an admin. Email alone is never
// enough: Google must have vouched for it (a linked identity) and the account
// must have no password a squatter could have set.
export const isAdminAccount = async (user) => Boolean(user?.id && (await isAdminUser(user.id, adminEmails())));

const LOOPBACK_IPS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const hostOf = (value) => {
  try {
    return new URL(`http://${value}`).hostname;
  } catch {
    return "";
  }
};

function isLocalAdmin(headers) {
  if ((process.env.SQRAP_ADMIN ?? process.env.JETHRO_ADMIN) !== "1") return false;
  if (!LOOPBACK_IPS.has(headers.get("x-sqrap-peer") || "")) return false;
  if (!LOOPBACK_HOSTS.has(hostOf(headers.get("host") || ""))) return false;
  const origin = headers.get("origin");
  if (origin) {
    try {
      if (!LOOPBACK_HOSTS.has(new URL(origin).hostname)) return false;
    } catch {
      return false;
    }
  }
  return true;
}

// True when the Origin header names the host the request was sent to.
function sameOrigin(headers) {
  const origin = headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === (headers.get("host") || "").toLowerCase();
  } catch {
    return false;
  }
}

async function isSignedInAdmin(headers, mutation) {
  if (headers.get("origin") ? !sameOrigin(headers) : mutation) return false;
  return isAdminAccount(await sessionUser({ headers }));
}

// `headers` is a Headers object: request.headers in a route handler, or
// `await headers()` in a page. `mutation` is true for anything but GET/HEAD.
export async function isAdminRequest(headers, { mutation = false } = {}) {
  return isLocalAdmin(headers) || (await isSignedInAdmin(headers, mutation));
}

export const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

// Re-capture and re-judge run in the in-process queue (lib/jobs.js) with a
// local browser. A Vercel function freezes after it answers and each poll may
// reach another instance, so there they are off; the cron pipeline keeps
// capturing and judging new sites.
export const jobsAvailable = () => !process.env.VERCEL;
export const JOBS_OFF = "Re-capture and re-judge run only in a local admin (npm run dev); this deployment cannot run them";

// Wraps an admin route handler: 404 unless isAdminRequest, JSON `{ data }` on
// success, `{ error }` with the thrown error's `status` (default 500).
export function adminRoute(handler) {
  return async (request, ctx) => {
    const mutation = !["GET", "HEAD"].includes(request.method);
    if (!(await isAdminRequest(request.headers, { mutation }))) return notFound();
    try {
      const data = await handler(request, ctx);
      if (data instanceof Response) return data;
      if (data == null) return Response.json({ error: { message: "Not found" } }, { status: 404 });
      return Response.json({ data }, { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      const status = err.status || 500;
      if (status >= 500) console.error(err);
      return Response.json({ error: { message: err.message || "Admin request failed", fields: err.fields } }, { status });
    }
  };
}

export function httpError(status, message, fields) {
  return Object.assign(new Error(message), { status, fields });
}

// The JSON body of a mutation. Requires a JSON content type, which a
// cross-site form post cannot send without a CORS preflight.
export async function jsonBody(request) {
  if (!/^application\/json\b/i.test(request.headers.get("content-type") || "")) throw httpError(415, "Send application/json");
  try {
    return await request.json();
  } catch {
    throw httpError(400, "Body is not JSON");
  }
}
