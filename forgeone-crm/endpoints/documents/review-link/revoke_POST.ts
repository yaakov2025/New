import { db } from "../../../helpers/db";
import { getOrgContext } from "../../../helpers/getOrgContext";
import { schema, OutputType } from "./revoke_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin", "manager"] });
    const input = schema.parse(superjson.parse(await request.text()));

    const link = await db.selectFrom("documentReviewLinks")
      .where("id", "=", input.linkId)
      .where("orgId", "=", orgId)
      .executeTakeFirst();

    if (!link) throw new Error("Link not found");

    await db.updateTable("documentReviewLinks")
      .set({
        isRevoked: true,
        revokedAt: new Date(),
        revokedBy: user.id
      })
      .where("id", "=", input.linkId)
      .execute();

    return new Response(superjson.stringify({ success: true } satisfies OutputType));
  } catch (error: any) {
    console.error("Revoke review link error:", error);
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}