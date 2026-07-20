import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { schema, OutputType } from "./save_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId, user, orgRole } = await getOrgContext(request, { requireOrgRole: ["admin", "manager"] });
    const { id, startDate, targetCompletionDate, ...data } = schema.parse(superjson.parse(await request.text()));

    let jobId = id;
    await db.transaction().execute(async (trx) => {
      if (id) {
        const oldJob = await trx.selectFrom("jobs").select(["status", "needsReview"]).where("id", "=", id).executeTakeFirst();
        await trx.updateTable("jobs").set({ ...data, startDate, targetCompletionDate, updatedAt: new Date(), updatedBy: user.id }).where("id", "=", id).where("orgId", "=", orgId).execute();
        
        if (oldJob && data.status && oldJob.status !== data.status) {
          await trx.insertInto("jobActivityEvents").values({ orgId, jobId: id, eventType: "status_changed", description: `Status changed from ${oldJob.status} to ${data.status}`, userId: user.id }).execute();
        }
        if (oldJob && typeof data.needsReview === "boolean" && oldJob.needsReview !== data.needsReview) {
          await trx.insertInto("jobActivityEvents").values({ orgId, jobId: id, eventType: "needs_review_changed", description: data.needsReview ? "Flagged for review" : "Review flag cleared", userId: user.id }).execute();
        }
      } else {
        const res = await trx.insertInto("jobs").values({ ...data, startDate, targetCompletionDate, orgId, createdBy: user.id }).returning("id").executeTakeFirstOrThrow();
        jobId = res.id;
        await trx.insertInto("jobActivityEvents").values({ orgId, jobId: res.id, eventType: "created", description: "Job created", userId: user.id }).execute();
      }
    });

    return new Response(superjson.stringify({ success: true, id: jobId! } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}