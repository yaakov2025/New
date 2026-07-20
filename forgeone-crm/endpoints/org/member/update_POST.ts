import { db } from '../../../helpers/db';
import { getOrgContext } from '../../../helpers/getOrgContext';
import { schema, OutputType } from "./update_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin"] });
    const json = superjson.parse(await request.text());
    const { memberId, role, action } = schema.parse(json);

    // Verify membership exists
    const membership = await db.selectFrom("orgMemberships").
    selectAll().
    where("userId", "=", memberId).
    where("orgId", "=", orgId).
    executeTakeFirst();

    if (!membership) {
      throw new Error("Membership not found");
    }

    if (membership.userId === user.id) {
      throw new Error("Cannot modify your own membership");
    }

    if (action === "remove") {
      await db.deleteFrom("orgMemberships").
      where("userId", "=", memberId).
      where("orgId", "=", orgId).
      execute();
    } else if (role) {
      await db.updateTable("orgMemberships").
      set({ role }).
      where("userId", "=", memberId).
      where("orgId", "=", orgId).
      execute();
    }

    return new Response(superjson.stringify({ success: true } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}