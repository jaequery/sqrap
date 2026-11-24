// The admin's guard. Server only (it reaches lib/db.js through lib/auth.js).
// A request may use the admin in either of two ways; anything else gets a plain
// 404, so the admin stays invisible:
//
// - Local: SQRAP_ADMIN=1 AND the request arrived over loopback. The socket
//   address (stamped by next.config.mjs), the Host header and, when sent, the
//   Origin all have to be local.
// - Signed in, on any deployment: the session's account is an admin
//   (isAdminUser in lib/db.js: listed in admin_emails, migration 012, with a
//   linked Google identity). Mutations must also carry an Origin matching the
//   Host; with the SameSite=Lax session cookie that keeps other sites out.
import { isAdminUser } from "./db.js";
import { sessionUser } from "./auth.js";

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
  const user = await sessionUser({ headers });
  return Boolean(user && (await isAdminUser(user.id)));
}

// `headers` is a Headers object: request.headers in a route handler, or
// `await headers()` in a page. `mutation` is true for anything but GET/HEAD.
export async function isAdminRequest(headers, { mutation = false } = {}) {
  return isLocalAdmin(headers) || (await isSignedInAdmin(headers, mutation));
}

export const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

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
