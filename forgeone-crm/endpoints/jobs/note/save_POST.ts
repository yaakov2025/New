import { db } from "../../../helpers/db";
import { getOrgContext } from "../../../helpers/getOrgContext";
import { schema, OutputType } from "./save_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin", "manager"] });
    const { jobId, content } = schema.parse(superjson.parse(await request.text()));

    const job = await db.selectFrom("jobs").select("id").where("id", "=", jobId).where("orgId", "=", orgId).executeTakeFirst();
    if (!job) throw new Error("Job not found in current organization");

    const note = await db.transaction().execute(async (trx) => {
      const res = await trx.insertInto("jobNotes").values({
        jobId,
        orgId,
        content,
        createdBy: user.id
      }).returningAll().executeTakeFirstOrThrow();

      await trx.insertInto("jobActivityEvents").values({
        orgId,
        jobId,
        eventType: "note_added",
        description: "Note added",
        userId: user.id
      }).execute();

      return res;
    });

    return new Response(superjson.stringify({ success: true, note } as OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}