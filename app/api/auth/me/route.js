import { isAdminAccount } from "../../../../lib/admin";
import { fail, googleEnabled, ok, publicUser, sessionUser } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

// The signed-in user (or null) and whether Google sign-in is configured.
// `user.isAdmin` says whether the caller's own account may open /admin
// (lib/admin.js); it is never reported for anyone else. The
// header calls this on every page load; a database failure answers 503 and the
// client stays signed out instead of breaking browsing.
export async function GET(request) {
  let user = null;
  let isAdmin = false;
  try {
    user = await sessionUser(request);
    isAdmin = await isAdminAccount(user);
  } catch (err) {
    console.error(err);
    return fail(503, "Accounts are unavailable right now");
  }
  return ok({ user: user ? { ...publicUser(user), isAdmin } : null, googleEnabled: googleEnabled() });
}
