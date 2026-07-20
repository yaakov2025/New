import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { OutputType } from "./members_GET.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId } = await getOrgContext(request, { requireOrgRole: ["admin", "manager"] });

    const members = await db
      .selectFrom("orgMemberships")
      .innerJoin("users", "orgMemberships.userId", "users.id")
      .select([
        "users.id",
        "users.displayName",
        "users.email",
        "users.avatarUrl",
        "orgMemberships.role",
        "orgMemberships.joinedAt",
      ])
      .where("orgMemberships.orgId", "=", orgId)
      .execute();

    return new Response(superjson.stringify({ members } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}