import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { schema, OutputType } from "./overview_GET.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { user } = await getOrgContext(request);
    
    if (user.role !== "super_admin") {
      throw new Error("Unauthorized");
    }

    const orgsRes = await db.selectFrom("organizations").select(db.fn.count("id").as("cnt")).executeTakeFirst();
    const totalOrgs = Number(orgsRes?.cnt || 0);

    const usersRes = await db.selectFrom("users").select(db.fn.count("id").as("cnt")).executeTakeFirst();
    const totalUsers = Number(usersRes?.cnt || 0);

    const organizations = await db.selectFrom("organizations")
      .select([
        "id",
        "name",
        "slug",
        "createdAt",
        (eb) => eb.selectFrom("orgMemberships").select(eb.fn.count("id").as("cnt")).whereRef("orgId", "=", "organizations.id").as("memberCount"),
        (eb) => eb.selectFrom("jobs").select(eb.fn.count("id").as("cnt")).whereRef("orgId", "=", "organizations.id").as("jobCount"),
      ])
      .execute();

    return new Response(superjson.stringify({
      totalOrgs,
      totalUsers,
      organizations: organizations.map(o => ({
        ...o,
        memberCount: Number(o.memberCount || 0),
        jobCount: Number(o.jobCount || 0)
      }))
    } as OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}