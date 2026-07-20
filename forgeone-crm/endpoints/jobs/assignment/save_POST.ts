import { db } from "../../../helpers/db";
import { getOrgContext } from "../../../helpers/getOrgContext";
import { schema, OutputType } from "./save_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin", "manager"] });
    const { jobId, userIds } = schema.parse(superjson.parse(await request.text()));

    const job = await db.selectFrom("jobs").select("id").where("id", "=", jobId).where("orgId", "=", orgId).executeTakeFirst();
    if (!job) throw new Error("Job not found in current organization");

    if (userIds.length > 0) {
      const memberships = await db.selectFrom("orgMemberships").select("userId").where("orgId", "=", orgId).where("userId", "in", userIds).execute();
      if (memberships.length !== userIds.length) {
        throw new Error("Some users are not members of the current organization");
      }
    }

    await db.transaction().execute(async (trx) => {
      await trx.deleteFrom("jobAssignments").where("jobId", "=", jobId).where("orgId", "=", orgId).execute();
      
      if (userIds.length > 0) {
        await trx.insertInto("jobAssignments").values(userIds.map(uid => ({
          jobId,
          orgId,
          userId: uid
        }))).execute();
      }

      await trx.insertInto("jobActivityEvents").values({
        orgId,
        jobId,
        eventType: "assignment_changed",
        description: "Job assignments updated",
        userId: user.id
      }).execute();
    });

    return new Response(superjson.stringify({ success: true } as OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}