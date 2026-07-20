import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { schema, OutputType } from "./switch_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { user, session } = await getServerUserSession(request);
    const json = superjson.parse(await request.text());
    const { orgId } = schema.parse(json);

    const isSuperAdmin = user.role === "super_admin";
    
    let role = null;
    let orgName = null;

    const membership = await db
      .selectFrom("orgMemberships")
      .innerJoin("organizations", "orgMemberships.orgId", "organizations.id")
      .select(["orgMemberships.role", "organizations.name"])
      .where("orgMemberships.orgId", "=", orgId)
      .where("orgMemberships.userId", "=", user.id)
      .executeTakeFirst();

    if (!membership && !isSuperAdmin) {
      throw new Error("You do not have access to this organization");
    }

    if (membership) {
      role = membership.role;
      orgName = membership.name;
    } else if (isSuperAdmin) {
      const org = await db.selectFrom("organizations").select("name").where("id", "=", orgId).executeTakeFirst();
      orgName = org?.name || "Unknown";
    }

    await db.updateTable("sessions").set({ currentOrgId: orgId }).where("id", "=", session.id).execute();
    await db.updateTable("users").set({ lastOrgId: orgId }).where("id", "=", user.id).execute();

    const updatedUser = {
      ...user,
      currentOrgId: orgId,
      currentOrgRole: role,
      currentOrgName: orgName,
    } as any; // satisfying User type

    return new Response(superjson.stringify({ user: updatedUser } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}