import { adminRoute } from "../../../../lib/admin";
import { listUsers } from "../../../../lib/admin-data";
import { sessionUser } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

// ?q= filters by email or name. `self` marks the signed-in admin's own account.
export const GET = adminRoute(async (request) => listUsers({
  q: new URL(request.url).searchParams.get("q") || "",
  selfId: (await sessionUser(request))?.id ?? null,
}));
