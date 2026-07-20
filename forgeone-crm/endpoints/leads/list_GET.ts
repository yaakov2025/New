import { db } from "../../helpers/db";
import { getOrgContext } from "../../helpers/getOrgContext";
import { OutputType } from "./list_GET.schema";
import superjson from "superjson";
import { sql } from "kysely";

export async function handle(request: Request) {
  try {
    const { orgId } = await getOrgContext(request);
    const url = new URL(request.url);
    const search = url.searchParams.get("search");
    const stageId = url.searchParams.get("stageId");
    const assignedTo = url.searchParams.get("assignedTo");

    let query = db.selectFrom("leads")
      .leftJoin("pipelineStages", "leads.stageId", "pipelineStages.id")
      .leftJoin("customers", "leads.customerId", "customers.id")
      .leftJoin("contacts", "leads.contactId", "contacts.id")
      .leftJoin("users", "leads.assignedTo", "users.id")
      .select([
        "leads.id", "leads.name", "leads.source", "leads.stageId", "leads.customerId",
        "leads.contactId", "leads.propertyId", "leads.assignedTo", "leads.estimatedValue",
        "leads.notes", "leads.isConverted", "leads.convertedOpportunityId", "leads.createdAt",
        "leads.orgId", "leads.updatedAt", "leads.createdBy", "leads.isDeleted",
        "pipelineStages.name as stageName", "pipelineStages.color as stageColor",
        "customers.name as customerName", sql<string>`CONCAT(contacts.first_name, ' ', contacts.last_name)`.as("contactName"),
        "users.displayName as assigneeName"
      ])
      .where("leads.orgId", "=", orgId)
      .where("leads.isDeleted", "is not", true)
      .where("leads.isConverted", "is not", true);

    if (search) query = query.where("leads.name", "ilike", `%${search}%`);
    if (stageId) query = query.where("leads.stageId", "=", Number(stageId));
    if (assignedTo) query = query.where("leads.assignedTo", "=", Number(assignedTo));

    const leads = await query.orderBy("leads.createdAt", "desc").execute();
    return new Response(superjson.stringify({ leads } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}