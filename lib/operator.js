// The operator API's guard (app/api/operator/**). Server only. Unlike the local
// admin (lib/admin.js), it answers remote callers, but only those that send
// `Authorization: Bearer $SQRAP_INGEST_TOKEN`. Without that env var (or with one
// shorter than 32 characters) the API does not exist: every request gets the
// same plain 404 as a wrong token, so it cannot be discovered by probing.
import { createHash, timingSafeEqual } from "node:crypto";
import { httpError, notFound } from "./admin.js";

const MIN_TOKEN_LENGTH = 32;
const digest = (value) => createHash("sha256").update(value).digest();

// `headers` is a Headers object (request.headers in a route handler).
export function isOperatorRequest(headers) {
  const token = process.env.SQRAP_INGEST_TOKEN || "";
  if (token.length < MIN_TOKEN_LENGTH) return false;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(headers.get("authorization") || "");
  if (!match) return false;
  // Equal-length digests, so the comparison takes the same time for any input.
  return timingSafeEqual(digest(match[1]), digest(token));
}

// Wraps an operator route handler: 404 unless isOperatorRequest, JSON `{ data }`
// on success, `{ error }` with the thrown error's `status` (default 500).
export function operatorRoute(handler) {
  return async (request, ctx) => {
    if (!isOperatorRequest(request.headers)) return notFound();
    try {
      const data = await handler(request, ctx);
      return Response.json({ data }, { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      const status = err.status || 500;
      if (status >= 500) console.error(err);
      return Response.json({ error: { message: err.message || "Operator request failed", fields: err.fields } }, { status, headers: { "Cache-Control": "no-store" } });
    }
  };
}

export { httpError };
