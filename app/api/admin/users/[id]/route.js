import { adminRoute, jsonBody } from "../../../../../lib/admin";
import { deleteUser, userAction } from "../../../../../lib/admin-data";
import { sessionUser } from "../../../../../lib/auth";

export const dynamic = "force-dynamic";

// The signed-in admin's own account id, or null (local SQRAP_ADMIN=1 without a
// session): self-actions are refused against it in lib/admin-data.js.
const selfOf = async (request) => (await sessionUser(request))?.id ?? null;

// { action: "signout" | "revoke_keys" | "grant_admin" | "revoke_admin" }
export const PATCH = adminRoute(async (request, { params }) => {
  const body = await jsonBody(request);
  return userAction((await params).id, String(body?.action ?? ""), { selfId: await selfOf(request) });
});

export const DELETE = adminRoute(async (request, { params }) => deleteUser((await params).id, { selfId: await selfOf(request) }));
