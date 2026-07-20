import { db } from "../../../helpers/db";
import { getOrgContext } from "../../../helpers/getOrgContext";
import { schema, OutputType } from "./save_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request, { requireOrgRole: ["admin", "manager"] });
    const { jobId, ...data } = schema.parse(superjson.parse(await request.text()));

    let insuranceId = 0;
    await db.transaction().execute(async (trx) => {
      const existing = await trx.selectFrom("jobInsurance").select("id").where("jobId", "=", jobId).where("orgId", "=", orgId).executeTakeFirst();

      if (existing) {
        await trx.updateTable("jobInsurance").set({ ...data, updatedAt: new Date() }).where("id", "=", existing.id).execute();
        insuranceId = existing.id;
      } else {
        const res = await trx.insertInto("jobInsurance").values({
          jobId,
          orgId,
          ...data,
          createdBy: user.id
        }).returning("id").executeTakeFirstOrThrow();
        insuranceId = res.id;
      }

      await trx.insertInto("jobActivityEvents").values({
        orgId,
        jobId,
        eventType: "insurance_updated",
        description: "Insurance details updated",
        userId: user.id
      }).execute();
    });

    return new Response(superjson.stringify({ success: true, id: insuranceId } as OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}