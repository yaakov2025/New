import { db } from '../../../helpers/db';
import { getOrgContext } from '../../../helpers/getOrgContext';
import { OutputType } from "./list_GET.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId } = await getOrgContext(request, { requireOrgRole: ["admin"] });

    const invitations = await db.
    selectFrom("orgInvitations").
    leftJoin("users", "orgInvitations.invitedBy", "users.id").
    select([
    "orgInvitations.id",
    "orgInvitations.orgId",
    "orgInvitations.email",
    "orgInvitations.role",
    "orgInvitations.token",
    "orgInvitations.status",
    "orgInvitations.invitedBy",
    "orgInvitations.expiresAt",
    "orgInvitations.createdAt",
    "users.displayName as invitedByName"]
    ).
    where("orgInvitations.orgId", "=", orgId).
    where("orgInvitations.status", "=", "pending").
    orderBy("orgInvitations.createdAt", "desc").
    execute();

    return new Response(
      superjson.stringify({ invitations } satisfies OutputType)
    );
  } catch (error) {
    if (error instanceof Error) {
      return new Response(superjson.stringify({ error: error.message }), { status: 400 });
    }
    return new Response(superjson.stringify({ error: "An unknown error occurred" }), { status: 400 });
  }
}