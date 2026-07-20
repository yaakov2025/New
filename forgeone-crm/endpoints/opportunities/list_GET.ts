import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { OutputType } from "./list_GET.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const { orgId } = await getOrgContext(request);
    const url = new URL(request.url);
    const search = url.searchParams.get("search");
    const stageId = url.searchParams.get("stageId");
    const assignedTo = url.searchParams.get("assignedTo");

    let query = db.selectFrom("opportunities")
      .leftJoin("pipelineStages", "opportunities.stageId", "pipelineStages.id")
      .leftJoin("customers", "opportunities.customerId", "customers.id")
      .leftJoin("users", "opportunities.assignedTo", "users.id")
      .select([
        "opportunities.id", "opportunities.name", "opportunities.value", "opportunities.stageId",
        "opportunities.expectedCloseDate", "opportunities.customerId", "opportunities.contactId",
        "opportunities.propertyId", "opportunities.assignedTo", "opportunities.notes", "opportunities.isWon",
        "opportunities.convertedJobId", "opportunities.createdAt", "opportunities.orgId",
        "opportunities.updatedAt", "opportunities.createdBy", "opportunities.leadId", "opportunities.isDeleted",
        "pipelineStages.name as stageName", "pipelineStages.color as stageColor",
        "customers.name as customerName", "users.displayName as assigneeName"
      ])
      .where("opportunities.orgId", "=", orgId)
      .where("opportunities.isDeleted", "is not", true)
      .where("opportunities.isWon", "is not", true);

    if (search) query = query.where("opportunities.name", "ilike", `%${search}%`);
    if (stageId) query = query.where("opportunities.stageId", "=", Number(stageId));
    if (assignedTo) query = query.where("opportunities.assignedTo", "=", Number(assignedTo));

    const opportunities = await query.orderBy("opportunities.createdAt", "desc").execute();
    return new Response(superjson.stringify({ opportunities } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}