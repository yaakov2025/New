import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { OutputType, OrgWithDetails } from "./list_GET.schema";
import superjson from "superjson";
import { sql } from "kysely";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);

    let query = db
      .selectFrom("organizations")
      .leftJoin("orgMemberships", "organizations.id", "orgMemberships.orgId")
      .select([
        "organizations.id",
        "organizations.name",
        "organizations.slug",
        "organizations.logoUrl",
        "organizations.primaryColor",
        "organizations.secondaryColor",
        "organizations.plan",
        "organizations.status",
        "organizations.address",
        "organizations.city",
        "organizations.state",
        "organizations.zip",
        "organizations.phone",
        "organizations.email",
        "organizations.website",
        "organizations.createdAt",
        "organizations.updatedAt",
        "organizations.createdBy",
        "organizations.updatedBy",
        "organizations.isDeleted",
      ])
      .select((eb) =>
        eb
          .selectFrom("orgMemberships as om2")
          .select(eb.fn.countAll().as("memberCount"))
          .whereRef("om2.orgId", "=", "organizations.id")
          .as("memberCount")
      )
      .where("organizations.isDeleted", "is not", true);

    if (user.role === "super_admin") {
      query = query.select(sql<string | null>`NULL`.as("role"));
    } else {
      query = query
        .select("orgMemberships.role as role")
        .where("orgMemberships.userId", "=", user.id);
    }

    const orgs = await query.execute();

    const mappedOrgs = orgs.map(o => ({
      ...o,
      memberCount: Number(o.memberCount || 0)
    }));

    return new Response(superjson.stringify({ orgs: mappedOrgs } as OutputType), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in org/list_GET:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(superjson.stringify({ error: message }), { status: 400 });
  }
}