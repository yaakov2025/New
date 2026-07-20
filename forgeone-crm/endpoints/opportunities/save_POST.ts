import { db } from "../../helpers/db";
import { getOrgContext, AuthorizationError } from "../../helpers/getOrgContext";
import { schema, OutputType } from "./save_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId, user, orgRole } = await getOrgContext(request);
    const { id, action, expectedCloseDate, ...data } = schema.parse(superjson.parse(await request.text()));

    if (action === "convert" && orgRole !== "admin" && orgRole !== "manager") {
      throw new AuthorizationError("Sales role cannot convert opportunities to jobs");
    }

    if (action === "delete" && id) {
      await db.updateTable("opportunities").set({ isDeleted: true }).where("id", "=", id).where("orgId", "=", orgId).execute();
      return new Response(superjson.stringify({ success: true, id } satisfies OutputType));
    }

    if (action === "convert" && id) {
      const res = await db.transaction().execute(async (trx) => {
        const opp = await trx.selectFrom("opportunities").selectAll().where("id", "=", id).where("orgId", "=", orgId).executeTakeFirstOrThrow();
        
        const job = await trx.insertInto("jobs").values({
          orgId,
          name: opp.name,
          customerId: opp.customerId,
          propertyId: opp.propertyId,
          opportunityId: opp.id,
          estimatedValue: opp.value,
          notes: opp.notes,
          status: "New",
          createdBy: user.id
        }).returning("id").executeTakeFirstOrThrow();

        if (opp.contactId) {
          await trx.insertInto("jobContacts").values({ jobId: job.id, contactId: opp.contactId, orgId, createdBy: user.id }).execute();
        }

        if (opp.assignedTo) {
          await trx.insertInto("jobAssignments").values({ jobId: job.id, orgId, userId: opp.assignedTo }).execute();
        }

        await trx.updateTable("opportunities").set({ isWon: true, convertedJobId: job.id }).where("id", "=", id).execute();
        await trx.insertInto("jobActivityEvents").values({ orgId, jobId: job.id, eventType: "created", description: "Job created from opportunity", userId: user.id }).execute();

        const estimates = await trx.selectFrom("jobDocuments")
          .select(["id", "documentNumber"])
          .where("opportunityId", "=", opp.id)
          .where("orgId", "=", orgId)
          .execute();

        for (const estimate of estimates) {
          await trx.updateTable("jobDocuments")
            .set({ jobId: job.id })
            .where("id", "=", estimate.id)
            .execute();

          await trx.insertInto("jobActivityEvents").values({
            orgId,
            jobId: job.id,
            eventType: "document_linked",
            description: `Estimate ${estimate.documentNumber} linked from opportunity`,
            userId: user.id,
          }).execute();
        }

        return job.id;
      });
      return new Response(superjson.stringify({ success: true, id, convertedJobId: res } satisfies OutputType));
    }

    let oppId = id;
    if (id) {
      await db.updateTable("opportunities").set({ ...data, expectedCloseDate, updatedAt: new Date() }).where("id", "=", id).where("orgId", "=", orgId).execute();
    } else {
      const res = await db.insertInto("opportunities").values({ ...data, expectedCloseDate, orgId, createdBy: user.id }).returning("id").executeTakeFirstOrThrow();
      oppId = res.id;
    }

    return new Response(superjson.stringify({ success: true, id: oppId! } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}