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
    const status = url.searchParams.get("status");
    const needsReview = url.searchParams.get("needsReview");
    const assignedTo = url.searchParams.get("assignedTo");

    let query = db.selectFrom("jobs")
      .leftJoin("customers", "jobs.customerId", "customers.id")
      .leftJoin("properties", "jobs.propertyId", "properties.id")
      .leftJoin("jobStatuses", (join) => join.onRef("jobStatuses.name", "=", "jobs.status").onRef("jobStatuses.orgId", "=", "jobs.orgId"))
      .select([
        "jobs.id", "jobs.name", "jobs.jobType", "jobs.status", "jobs.needsReview",
        "jobs.customerId", "jobs.propertyId", "jobs.estimatedValue", "jobs.startDate",
        "jobs.targetCompletionDate", "jobs.nextStep", "jobs.notes", "jobs.isInsuranceJob",
        "jobs.createdAt", "jobs.updatedAt", "jobs.orgId", "jobs.opportunityId", "jobs.createdBy", "jobs.updatedBy", "jobs.isDeleted",
        "customers.name as customerName", "properties.address as propertyAddress",
        "jobStatuses.color as statusColor"
      ])
      .where("jobs.orgId", "=", orgId)
      .where("jobs.isDeleted", "is not", true);

    if (search) query = query.where("jobs.name", "ilike", `%${search}%`);
    if (status) query = query.where("jobs.status", "=", status);
    if (needsReview === "true") query = query.where("jobs.needsReview", "=", true);
    if (assignedTo) {
      query = query.where((eb) => eb.exists(
        eb.selectFrom("jobAssignments").whereRef("jobId", "=", "jobs.id").where("userId", "=", Number(assignedTo))
      ));
    }

    const jobs = await query.orderBy("jobs.updatedAt", "desc").execute();
    
    const jobIds = jobs.map(j => j.id);
    let assigneesByJob: Record<number, string[]> = {};

    if (jobIds.length > 0) {
      const assignments = await db.selectFrom("jobAssignments")
        .innerJoin("users", "jobAssignments.userId", "users.id")
        .select(["jobAssignments.jobId", "users.displayName"])
        .where("jobAssignments.jobId", "in", jobIds)
        .execute();
        
      assignments.forEach(a => {
        if (!assigneesByJob[a.jobId]) assigneesByJob[a.jobId] = [];
        assigneesByJob[a.jobId].push(a.displayName);
      });
    }

    const mapped = jobs.map(j => ({ ...j, assignees: assigneesByJob[j.id] || [] }));
    return new Response(superjson.stringify({ jobs: mapped } satisfies OutputType));
  } catch (error: any) {
    return new Response(superjson.stringify({ error: error.message }), { status: 400 });
  }
}