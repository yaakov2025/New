import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { schema, OutputType } from "./save_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId, user } = await getOrgContext(request);
    const { id, action, ...data } = schema.parse(superjson.parse(await request.text()));

    if (action === "delete" && id) {
      await db.updateTable("leads").set({ isDeleted: true }).where("id", "=", id).where("orgId", "=", orgId).execute();
      return new Response(superjson.stringify({ success: true, id } satisfies OutputType));
    }

    if (action === "convert" && id) {
      const res = await db.transaction().execute(async (trx) => {
        const lead = await trx.selectFrom("leads").selectAll().where("id", "=", id).where("orgId", "=", orgId).executeTakeFirstOrThrow();
        const stage = await trx.selectFrom("pipelineStages").select("id").where("orgId", "=", orgId).where("pipelineType", "=", "opportunity").orderBy("sortOrder", "asc").executeTakeFirst();
        
        const opp = await trx.insertInto("opportunities").values({
          orgId,
          name: lead.name,
          customerId: lead.customerId,
          contactId: lead.contactId,
          propertyId: lead.propertyId,
          assignedTo: lead.assignedTo,
          value: lead.estimatedValue,
          notes: lead.notes,
          leadId: lead.id,
          stageId: stage?.id || null,
          createdBy: user.id
        }).returning("id").executeTakeFirstOrThrow();

        await trx.updateTable("leads").set({ isConverted: true, convertedOpportunityId: opp.id }).where("id", "=", id).execute();
        return opp.id;
      });
      return new Response(superjson.stringify({ success: true, id, convertedOpportunityId: res } satisfies OutputType));
    }

    let leadId = id;
    if (id) {
      await db.updateTable("leads").set({ ...data, updatedAt: new Date() }).where("id", "=", id).where("orgId", "=", orgId).execute();
    } else {
      const res = await db.insertInto("leads").values({ ...data, orgId, createdBy: user.id }).returning("id").executeTakeFirstOrThrow();
      leadId = res.id;
    }

    return new Response(superjson.stringify({ success: true, id: leadId! } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}