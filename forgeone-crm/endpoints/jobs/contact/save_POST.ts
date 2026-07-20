import { db } from "../../../helpers/db";
import { getOrgContext } from "../../../helpers/getOrgContext";
import { schema, OutputType } from "./save_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin", "manager"] });
    const { jobId, contactId, action } = schema.parse(superjson.parse(await request.text()));

    await db.transaction().execute(async (trx) => {
      if (action === "add") {
        const existing = await trx.selectFrom("jobContacts").select("id").where("jobId", "=", jobId).where("contactId", "=", contactId).executeTakeFirst();
        if (!existing) {
          await trx.insertInto("jobContacts").values({ jobId, contactId, orgId, createdBy: user.id }).execute();
          await trx.insertInto("jobActivityEvents").values({
            orgId,
            jobId,
            eventType: "contact_added",
            description: "Contact added to job",
            userId: user.id
          }).execute();
        }
      } else if (action === "remove") {
        const res = await trx.deleteFrom("jobContacts").where("jobId", "=", jobId).where("contactId", "=", contactId).where("orgId", "=", orgId).executeTakeFirst();
        if (Number(res.numDeletedRows) > 0) {
          await trx.insertInto("jobActivityEvents").values({
            orgId,
            jobId,
            eventType: "contact_removed",
            description: "Contact removed from job",
            userId: user.id
          }).execute();
        }
      }
    });

    return new Response(superjson.stringify({ success: true } as OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}